import {
	type CCEncodingContext,
	type CommandClass,
	MGRPExtension,
	MPANExtension,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	SupervisionCC,
	SupervisionCCReport,
	SupervisionCommand,
	getInnermostCommandClass,
} from "@zwave-js/cc";
import {
	SecurityCCCommandEncapsulation,
	SecurityCCNonceGet,
	type SecurityCCNonceReport,
} from "@zwave-js/cc/SecurityCC";
import {
	MAX_SEGMENT_SIZE,
	RELAXED_TIMING_THRESHOLD,
	type TransportServiceCC,
	TransportServiceCCFirstSegment,
	TransportServiceCCSegmentComplete,
	TransportServiceCCSegmentRequest,
	TransportServiceCCSegmentWait,
	TransportServiceCCSubsequentSegment,
	TransportServiceTimeouts,
} from "@zwave-js/cc/TransportServiceCC";
import {
	CommandClasses,
	EncapsulationFlags,
	MessagePriority,
	NODE_ID_BROADCAST,
	SPANState,
	SecurityClass,
	type SendCommandOptions,
	type SupervisionResult,
	SupervisionStatus,
	TransmitOptions,
	ZWaveError,
	ZWaveErrorCodes,
	mergeSupervisionResults,
} from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import {
	type SendDataMessage,
	isSendData,
	isTransmitReport,
} from "@zwave-js/serial/serialapi";
import { type ContainsCC, containsCC } from "@zwave-js/serial/serialapi";
import { getErrorMessage } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import {
	type DeferredPromise,
	createDeferredPromise,
} from "alcalzone-shared/deferred-promise";
import type { Driver } from "./Driver.js";
import type { MessageGenerator } from "./Transaction.js";

export type MessageGeneratorImplementation<T extends Message> = (
	/** A reference to the driver */
	driver: Driver,
	ctx: CCEncodingContext,
	/** The "primary" message */
	message: T,
	/**
	 * A hook to get notified about each sent message and the result of the Serial API call
	 * without waiting for the message generator to finish completely.
	 */
	onMessageSent: (msg: Message, result: Message | undefined) => void,
	/** Can be used to extend the timeout waiting for a response from a node to the sent message */
	additionalCommandTimeoutMs?: number,
) => AsyncGenerator<Message, Message, Message>;

function maybePartialNodeUpdate(sent: Message, received: Message): boolean {
	// Some commands are returned in multiple segments, which may take longer than
	// the configured timeout.
	if (!containsCC(sent) || !containsCC(received)) {
		return false;
	}

	if (sent.getNodeId() !== received.getNodeId()) return false;

	if (received.command.ccId === CommandClasses["Transport Service"]) {
		// We don't know what's in there. It may be the expected update
		return true;
	}

	// Let the sent CC test if the received one is a match.
	// These predicates don't check if the received CC is complete, we can use them here.
	// This also doesn't check for correct encapsulation, but that is good enough to refresh the timer.
	const sentCommand = getInnermostCommandClass(sent.command);
	const receivedCommand = getInnermostCommandClass(received.command);
	return sentCommand.isExpectedCCResponse(receivedCommand);
}

export async function waitForNodeUpdate<T extends Message>(
	driver: Driver,
	msg: Message,
	timeoutMs: number,
): Promise<T> {
	try {
		return await driver.waitForMessage<T>(
			(received) => msg.isExpectedNodeUpdate(received),
			timeoutMs,
			(received) => maybePartialNodeUpdate(msg, received),
		);
	} catch {
		throw new ZWaveError(
			`Timed out while waiting for a response from the node`,
			ZWaveErrorCodes.Controller_NodeTimeout,
		);
	}
}

function getNodeUpdateTimeout(
	driver: Driver,
	msg: Message,
	additionalCommandTimeoutMs = 0,
): number {
	const commandTimeMs = Math.ceil((msg.rtt ?? 0) / 1e6);
	return (
		commandTimeMs
		+ driver.getReportTimeout(msg)
		+ additionalCommandTimeoutMs
	);
}

/** A simple message generator that simply sends a message, waits for the ACK (and the response if one is expected) */
export const simpleMessageGenerator: MessageGeneratorImplementation<Message> =
	async function*(
		driver,
		ctx,
		msg,
		onMessageSent,
		additionalCommandTimeoutMs = 0,
	) {
		// Make sure we can send this message
		if (isSendData(msg) && await driver.exceedsMaxPayloadLength(msg)) {
			// We use explorer frames by default, but this reduces the maximum payload length by 2 bytes compared to AUTO_ROUTE
			// Try disabling explorer frames for this message and see if it fits now.
			function fail(): never {
				throw new ZWaveError(
					"Cannot send this message because it would exceed the maximum payload length!",
					ZWaveErrorCodes.Controller_MessageTooLarge,
				);
			}
			if (msg.transmitOptions & TransmitOptions.Explore) {
				msg.transmitOptions &= ~TransmitOptions.Explore;
				if (await driver.exceedsMaxPayloadLength(msg)) {
					// Still too large
					fail();
				}
				driver.controllerLog.logNode(msg.getNodeId()!, {
					message:
						"Disabling explorer frames for this message due to its size",
					level: "warn",
				});
			} else {
				fail();
			}
		}

		// Pass this message to the send thread and wait for it to be sent
		let result: Message;
		// At this point we can't have received a premature update
		msg.prematureNodeUpdate = undefined;

		try {
			// The yield can throw and must be handled here
			result = yield msg;

			// Figure out how long the message took to be handled
			msg.markAsCompleted();

			onMessageSent(msg, result);
		} catch (e) {
			msg.markAsCompleted();
			throw e;
		}

		// If the message was sent to a node and came back with a NOK callback,
		// we want to inspect the callback, for example to look at TX statistics
		// or update the node status.
		//
		// We now need to throw because the callback was passed through so we could inspect it.
		if (isTransmitReport(result) && !result.isOK()) {
			// Throw the message in order to short-circuit all possible generators
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw result;
		}

		// If the sent message expects an update from the node, wait for it
		if (msg.expectsNodeUpdate()) {
			// We might have received the update prematurely. In that case, return it.
			if (msg.prematureNodeUpdate) return msg.prematureNodeUpdate;

			// CommandTime is measured by the application
			// ReportTime timeout SHOULD be set to CommandTime + 1 second.
			const timeout = getNodeUpdateTimeout(
				driver,
				msg,
				additionalCommandTimeoutMs,
			);
			return waitForNodeUpdate(driver, msg, timeout);
		}

		return result;
	};

/** A generator for singlecast SendData messages that automatically uses Transport Service when necessary */
export const maybeTransportServiceGenerator: MessageGeneratorImplementation<
	SendDataMessage & ContainsCC
> = async function*(
	driver,
	ctx,
	msg,
	onMessageSent,
	additionalCommandTimeoutMs,
) {
	// Make sure we can send this message
	/*if (!isSendData(msg) || !containsCC(msg)) {
			throw new ZWaveError(
				"Cannot use the Transport Service message generator for messages that are not SendData!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else*/ if (typeof msg.command.nodeId !== "number") {
		throw new ZWaveError(
			"Cannot use the Transport Service message generator for multicast commands!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const node = msg.tryGetNode(driver);
	const mayUseTransportService =
		node?.supportsCC(CommandClasses["Transport Service"])
		&& node.getCCVersion(CommandClasses["Transport Service"]) >= 2;

	if (
		!mayUseTransportService || !(await driver.exceedsMaxPayloadLength(msg))
	) {
		// Transport Service isn't needed for this message
		return yield* simpleMessageGenerator(
			driver,
			ctx,
			msg,
			onMessageSent,
			additionalCommandTimeoutMs,
		);
	}

	// Send the command split into multiple segments
	const payload = await msg.serializeCC(ctx);
	const numSegments = Math.ceil(payload.length / MAX_SEGMENT_SIZE);
	const segmentDelay = numSegments > RELAXED_TIMING_THRESHOLD
		? TransportServiceTimeouts.relaxedTimingDelayR2
		: 0;
	const sessionId = driver.getNextTransportServiceSessionId();
	const nodeId = msg.command.nodeId;

	// Since the command is never logged, we do it here
	driver.driverLog.print(
		"The following message is too large, using Transport Service to transmit it:",
	);
	driver.driverLog.logMessage(msg, {
		direction: "outbound",
	});

	// I don't see an elegant way to wait for possible responses, so we just register a handler in the driver
	// and remember the received commands
	let unhandledResponses: TransportServiceCC[] = [];
	const { unregister: unregisterHandler } = driver.registerCommandHandler(
		(cc) =>
			cc.nodeId === nodeId
			&& (cc instanceof TransportServiceCCSegmentWait
				|| (cc instanceof TransportServiceCCSegmentRequest
					&& cc.sessionId === sessionId)),
		(cc) => {
			unhandledResponses.push(cc as TransportServiceCC);
		},
	);

	const receivedSegmentWait = () => {
		const index = unhandledResponses.findIndex(
			(cc) => cc instanceof TransportServiceCCSegmentWait,
		);
		if (index >= 0) {
			const cc = unhandledResponses[
				index
			] as TransportServiceCCSegmentWait;
			unhandledResponses.splice(index, 1);
			return cc;
		}
	};

	const receivedSegmentRequest = () => {
		const index = unhandledResponses.findIndex(
			(cc) => cc instanceof TransportServiceCCSegmentRequest,
		);
		if (index >= 0) {
			const cc = unhandledResponses[
				index
			] as TransportServiceCCSegmentRequest;
			unhandledResponses.splice(index, 1);
			return cc;
		}
	};

	// We have to deal with multiple messages, but can only return a single result.
	// Therefore we use the last one as the result.
	let result!: Message;

	try {
		attempts: for (let attempt = 1; attempt <= 2; attempt++) {
			driver.controllerLog.logNode(nodeId, {
				message:
					`Beginning Transport Service TX session #${sessionId}...`,
				level: "debug",
				direction: "outbound",
			});

			// Clear the list of unhandled responses
			unhandledResponses = [];
			// Fill the list of unsent segments
			const unsentSegments = new Array(numSegments)
				.fill(0)
				.map((_, i) => i);
			let didRetryLastSegment = false;
			let isFirstTransferredSegment = true;

			while (unsentSegments.length > 0) {
				// Wait if necessary
				if (isFirstTransferredSegment) {
					isFirstTransferredSegment = false;
				} else if (segmentDelay) {
					await wait(segmentDelay, true);
				}
				const segment = unsentSegments.shift()!;

				const chunk = payload.subarray(
					segment * MAX_SEGMENT_SIZE,
					(segment + 1) * MAX_SEGMENT_SIZE,
				);
				let cc: TransportServiceCC;
				if (segment === 0) {
					cc = new TransportServiceCCFirstSegment({
						nodeId,
						sessionId,
						datagramSize: payload.length,
						partialDatagram: chunk,
					});
				} else {
					cc = new TransportServiceCCSubsequentSegment({
						nodeId,
						sessionId,
						datagramSize: payload.length,
						datagramOffset: segment * MAX_SEGMENT_SIZE,
						partialDatagram: chunk,
					});
				}

				const tmsg = driver.createSendDataMessage(cc, {
					autoEncapsulate: false,
					maxSendAttempts: msg.maxSendAttempts,
					transmitOptions: msg.transmitOptions,
				});
				result = yield* simpleMessageGenerator(
					driver,
					ctx,
					tmsg,
					onMessageSent,
				);

				let segmentComplete:
					| TransportServiceCCSegmentComplete
					| undefined = undefined;
				// After sending the last segment, wait for a SegmentComplete response, at the same time
				// give the node a chance to send a SegmentWait or SegmentRequest(s)
				if (segment === numSegments - 1) {
					segmentComplete = await driver
						.waitForCommand<TransportServiceCCSegmentComplete>(
							(cc) =>
								cc.nodeId === nodeId
								&& cc
									instanceof TransportServiceCCSegmentComplete
								&& cc.sessionId === sessionId,
							TransportServiceTimeouts.segmentCompleteR2,
						)
						.catch(() => undefined);
				}

				if (segmentComplete) {
					// We're done!
					driver.controllerLog.logNode(nodeId, {
						message:
							`Transport Service TX session #${sessionId} complete`,
						level: "debug",
						direction: "outbound",
					});
					break attempts;
				}

				// If we received a SegmentWait, we need to wait and restart
				const segmentWait = receivedSegmentWait();
				if (segmentWait) {
					const waitTime = segmentWait.pendingSegments * 100;
					driver.controllerLog.logNode(nodeId, {
						message:
							`Restarting Transport Service TX session #${sessionId} in ${waitTime} ms...`,
						level: "debug",
					});

					await wait(waitTime, true);
					continue attempts;
				}

				// If the node requested missing segments, add them to the list of unsent segments and continue transmitting
				let segmentRequest:
					| TransportServiceCCSegmentRequest
					| undefined = undefined;
				let readdedSegments = false;
				while ((segmentRequest = receivedSegmentRequest())) {
					unsentSegments.push(
						segmentRequest.datagramOffset / MAX_SEGMENT_SIZE,
					);
					readdedSegments = true;
				}
				if (readdedSegments) continue;

				// If we didn't receive anything after sending the last segment, retry the last segment
				if (segment === numSegments - 1) {
					if (didRetryLastSegment) {
						driver.controllerLog.logNode(nodeId, {
							message:
								`Transport Service TX session #${sessionId} failed`,
							level: "debug",
							direction: "outbound",
						});
						break attempts;
					} else {
						// Try the last segment again
						driver.controllerLog.logNode(nodeId, {
							message:
								`Transport Service TX session #${sessionId}: Segment Complete missing - re-transmitting last segment...`,
							level: "debug",
							direction: "outbound",
						});
						didRetryLastSegment = true;
						unsentSegments.unshift(segment);
						continue;
					}
				}
			}
		}
	} finally {
		// We're done, unregister the handler
		unregisterHandler();
	}

	// Transport Service CCs do not expect a node update and have no knowledge about the encapsulated CC.
	// Therefore we need to replicate the waiting from simpleMessageGenerator here

	// If the sent message expects an update from the node, wait for it
	if (msg.expectsNodeUpdate()) {
		// TODO: Figure out if we can handle premature updates with Transport Service CC
		const timeout = getNodeUpdateTimeout(
			driver,
			msg,
			additionalCommandTimeoutMs,
		);
		return waitForNodeUpdate(driver, msg, timeout);
	}

	return result;
};

/** A simple (internal) generator that simply sends a command, and optionally returns the response command */
async function* sendCommandGenerator<
	TResponse extends CommandClass = CommandClass,
>(
	driver: Driver,
	ctx: CCEncodingContext,
	command: CommandClass,
	onMessageSent: (msg: Message, result: Message | undefined) => void,
	options?: SendCommandOptions,
) {
	const msg = driver.createSendDataMessage(command, options);

	const resp = yield* maybeTransportServiceGenerator(
		driver,
		ctx,
		msg,
		onMessageSent,
	);
	if (resp && containsCC(resp)) {
		driver.unwrapCommands(resp);
		return resp.command as TResponse;
	}
}

/** A message generator for security encapsulated messages (S0) */
export const secureMessageGeneratorS0: MessageGeneratorImplementation<
	SendDataMessage & ContainsCC
> = async function*(driver, ctx, msg, onMessageSent) {
	/*if (!isSendData(msg)) {
			throw new ZWaveError(
				"Cannot use the S0 message generator for a command that's not a SendData message!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else*/ if (typeof msg.command.nodeId !== "number") {
		throw new ZWaveError(
			"Cannot use the S0 message generator for multicast commands!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	} else if (!(msg.command instanceof SecurityCCCommandEncapsulation)) {
		throw new ZWaveError(
			"The S0 message generator can only be used for Security S0 command encapsulation!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	// Step 1: Acquire a nonce
	const secMan = driver.securityManager!;
	const nodeId = msg.command.nodeId;
	let additionalTimeoutMs: number | undefined;

	// Try to get a free nonce before requesting a new one
	let nonce: Uint8Array | undefined = secMan.getFreeNonce(nodeId);
	if (!nonce) {
		// No free nonce, request a new one
		const cc = new SecurityCCNonceGet({
			nodeId: nodeId,
			endpointIndex: msg.command.endpointIndex,
		});
		const nonceResp = yield* sendCommandGenerator<
			SecurityCCNonceReport
		>(
			driver,
			ctx,
			cc,
			(msg, result) => {
				additionalTimeoutMs = Math.ceil(msg.rtt! / 1e6);
				onMessageSent(msg, result);
			},
			{
				// Only try getting a nonce once
				maxSendAttempts: 1,
			},
		);
		if (!nonceResp) {
			throw new ZWaveError(
				"No nonce received from the node, cannot send secure command!",
				ZWaveErrorCodes.SecurityCC_NoNonce,
			);
		}
		nonce = nonceResp.nonce;
	}
	msg.command.nonce = nonce;

	// Now send the actual secure command
	return yield* simpleMessageGenerator(
		driver,
		ctx,
		msg,
		onMessageSent,
		additionalTimeoutMs,
	);
};

/** A message generator for security encapsulated messages (S2) */
export const secureMessageGeneratorS2: MessageGeneratorImplementation<
	SendDataMessage & ContainsCC
> = async function*(driver, ctx, msg, onMessageSent) {
	if (!isSendData(msg) || !containsCC(msg)) {
		throw new ZWaveError(
			"Cannot use the S2 message generator for a command that's not a SendData message!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	} else if (typeof msg.command.nodeId !== "number") {
		throw new ZWaveError(
			"Cannot use the S2 message generator for multicast commands!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	} else if (!(msg.command instanceof Security2CCMessageEncapsulation)) {
		throw new ZWaveError(
			"The S2 message generator can only be used for Security S2 command encapsulation!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const nodeId = msg.command.nodeId;
	const secMan = driver.getSecurityManager2(nodeId)!;
	const spanState = secMan.getSPANState(nodeId);
	let additionalTimeoutMs: number | undefined;

	// We need a new nonce when there is no shared SPAN state, or the SPAN state is for a lower security class
	// than the command we want to send
	const expectedSecurityClass = msg.command.securityClass
		?? driver.getHighestSecurityClass(nodeId);

	if (
		spanState.type === SPANState.None
		|| spanState.type === SPANState.LocalEI
		|| (spanState.type === SPANState.SPAN
			&& spanState.securityClass !== SecurityClass.Temporary
			&& spanState.securityClass !== expectedSecurityClass)
	) {
		// Request a new nonce

		// No free nonce, request a new one
		const cc = new Security2CCNonceGet({
			nodeId: nodeId,
			endpointIndex: msg.command.endpointIndex,
		});
		const nonceResp = yield* sendCommandGenerator<
			Security2CCNonceReport
		>(
			driver,
			ctx,
			cc,
			(msg, result) => {
				additionalTimeoutMs = Math.ceil(msg.rtt! / 1e6);
				onMessageSent(msg, result);
			},
			{
				// Only try getting a nonce once
				maxSendAttempts: 1,
			},
		);
		if (!nonceResp) {
			throw new ZWaveError(
				"No nonce received from the node, cannot send secure command!",
				ZWaveErrorCodes.Security2CC_NoSPAN,
			);
		}

		// Storing the nonce is not necessary, this will be done automatically when the nonce is received
	}

	// Now send the actual secure command
	let response = yield* maybeTransportServiceGenerator(
		driver,
		ctx,
		msg,
		onMessageSent,
		additionalTimeoutMs,
	);

	// If we want to make sure that a node understood a SET-type S2-encapsulated message, we either need to use
	// Supervision and wait for the Supervision Report (handled by the simpleMessageGenerator), or we need to add a
	// short delay between commands and wait if a NonceReport is received.
	// However, in situations where timing is critical (e.g. S2 bootstrapping), verifyDelivery is set to false, and we don't do this.
	let nonceReport: Security2CCNonceReport | undefined;
	if (
		isTransmitReport(response)
		&& msg.command.verifyDelivery
		&& !msg.command.expectsCCResponse()
		&& !msg.command.getEncapsulatedCC(
			CommandClasses.Supervision,
			SupervisionCommand.Get,
		)
	) {
		nonceReport = await driver
			.waitForCommand<Security2CCNonceReport>(
				(cc) =>
					cc.nodeId === nodeId
					&& cc instanceof Security2CCNonceReport,
				500,
			)
			.catch(() => undefined);
	} else if (
		containsCC(response)
		&& response.command instanceof Security2CCNonceReport
	) {
		nonceReport = response.command;
	}

	if (nonceReport) {
		if (nonceReport.SOS && nonceReport.receiverEI) {
			// The node couldn't decrypt the last command we sent it. Invalidate
			// the shared SPAN, since it did the same
			secMan.storeRemoteEI(nodeId, nonceReport.receiverEI);
		}
		if (nonceReport.MOS) {
			const multicastGroupId = msg.command.getMulticastGroupId();
			if (multicastGroupId != undefined) {
				// The node couldn't decrypt the previous S2 multicast. Tell it the MPAN (again)
				const mpan = secMan.getInnerMPANState(multicastGroupId);
				if (mpan) {
					// Replace the MGRP extension with an MPAN extension
					msg.command.extensions = msg.command.extensions.filter(
						(e) => !(e instanceof MGRPExtension),
					);
					msg.command.extensions.push(
						new MPANExtension({
							groupId: multicastGroupId,
							innerMPANState: mpan,
						}),
					);
				}
			}
		}
		driver.controllerLog.logNode(nodeId, {
			message:
				`failed to decode the message, retrying with SPAN extension...`,
			direction: "none",
		});

		// Send the message again
		msg.prepareRetransmission();
		response = yield* maybeTransportServiceGenerator(
			driver,
			ctx,
			msg,
			onMessageSent,
			additionalTimeoutMs,
		);

		if (
			containsCC(response)
			&& response.command instanceof Security2CCNonceReport
		) {
			// No dice
			driver.controllerLog.logNode(nodeId, {
				message:
					`failed to decode the message after re-transmission with SPAN extension, dropping the message.`,
				direction: "none",
				level: "warn",
			});
			throw new ZWaveError(
				"The node failed to decode the message.",
				ZWaveErrorCodes.Security2CC_CannotDecode,
			);
		}
	}

	return response;
};

/** A message generator for security encapsulated messages (S2 Multicast) */
export const secureMessageGeneratorS2Multicast: MessageGeneratorImplementation<
	SendDataMessage & ContainsCC
> = async function*(driver, ctx, msg, onMessageSent) {
	if (!isSendData(msg) || !containsCC(msg)) {
		throw new ZWaveError(
			"Cannot use the S2 multicast message generator for a command that's not a SendData message!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	} else if (msg.command.isSinglecast()) {
		throw new ZWaveError(
			"Cannot use the S2 multicast message generator for singlecast commands!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	} else if (!(msg.command instanceof Security2CCMessageEncapsulation)) {
		throw new ZWaveError(
			"The S2 multicast message generator can only be used for Security S2 command encapsulation!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const groupId = msg.command.getMulticastGroupId();
	if (groupId == undefined) {
		throw new ZWaveError(
			"Cannot use the S2 multicast message generator without a multicast group ID!",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	const secMan = driver.getSecurityManager2(msg.command.nodeId)!;
	const group = secMan.getMulticastGroup(groupId);
	if (!group) {
		throw new ZWaveError(
			`Multicast group ${groupId} does not exist!`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	// Send the multicast command. We remember the transmit report and treat it as the result of the multicast command
	const response = yield* simpleMessageGenerator(
		driver,
		ctx,
		msg,
		onMessageSent,
	);

	// If a node in the group is out of sync, we need to transfer the MPAN state we're going to use for the next command.
	// Therefore increment the MPAN state now and not after the followups like the specs mention
	secMan.tryIncrementMPAN(groupId);

	// Unwrap the command again, so we can make the following encapsulation depend on the target node
	driver.unwrapCommands(msg);
	const command = msg.command;
	// Remember the original encapsulation flags
	const encapsulationFlags = command.encapsulationFlags;

	// In case someone sneaked a node ID into the group multiple times, remove duplicates for the singlecast followups
	// Otherwise, the node will increase its MPAN multiple times, going out of sync.
	const distinctNodeIDs = [...new Set(group.nodeIDs)];

	const supervisionResults: (SupervisionResult | undefined)[] = [];

	// Now do singlecast followups with every node in the group
	for (const nodeId of distinctNodeIDs) {
		// Point the CC at the target node
		(command.nodeId as number) = nodeId;
		// Figure out if supervision should be used
		command.encapsulationFlags = encapsulationFlags;
		command.toggleEncapsulationFlag(
			EncapsulationFlags.Supervision,
			SupervisionCC.mayUseSupervision(driver, command),
		);

		const scMsg = driver.createSendDataMessage(command, {
			transmitOptions: msg.transmitOptions,
			maxSendAttempts: msg.maxSendAttempts,
		});
		// The outermost command is a Security2CCMessageEncapsulation, we need to set the MGRP extension on this again
		(scMsg.command as Security2CCMessageEncapsulation).extensions.push(
			new MGRPExtension({ groupId }),
		);

		// Reuse the S2 singlecast message generator for sending this new message
		try {
			const scResponse = yield* secureMessageGeneratorS2(
				driver,
				ctx,
				scMsg,
				onMessageSent,
			);
			if (
				containsCC(scResponse)
				&& scResponse.command
					instanceof Security2CCMessageEncapsulation
				&& scResponse.command.hasMOSExtension()
			) {
				// The node understood the S2 singlecast followup, but told us that its MPAN is out of sync

				const innerMPANState = secMan.getInnerMPANState(groupId);
				// This should always be defined, but better not throw unnecessarily here
				if (innerMPANState) {
					const cc = new Security2CCMessageEncapsulation({
						nodeId,
						extensions: [
							new MPANExtension({
								groupId,
								innerMPANState,
							}),
						],
					});

					// Send it the MPAN
					yield* sendCommandGenerator(
						driver,
						ctx,
						cc,
						onMessageSent,
						{
							// Seems we need these options or some nodes won't accept the nonce
							transmitOptions: TransmitOptions.ACK
								| TransmitOptions.AutoRoute,
							// Only try sending a nonce once
							maxSendAttempts: 1,
							// Nonce requests must be handled immediately
							priority: MessagePriority.Immediate,
							// We don't want failures causing us to treat the node as asleep or dead
							changeNodeStatusOnMissingACK: false,
						},
					);
				}
			}

			// Collect supervision results if possible
			if (containsCC(scResponse)) {
				const supervisionReport = scResponse.command
					.getEncapsulatedCC(
						CommandClasses.Supervision,
						SupervisionCommand.Report,
					) as SupervisionCCReport | undefined;

				supervisionResults.push(
					supervisionReport?.toSupervisionResult(),
				);
			}
		} catch (e) {
			driver.driverLog.print(getErrorMessage(e), "error");
			// TODO: Figure out how we got here, and what to do now.
			// In any case, keep going with the next nodes
			// Report that there was a failure, so the application can show it
			supervisionResults.push({
				status: SupervisionStatus.Fail,
			});
		}
	}

	const finalSupervisionResult = mergeSupervisionResults(
		supervisionResults,
	);
	if (finalSupervisionResult) {
		// We can return return information about the success of this multicast - so we should
		// TODO: Not sure if we need to "wrap" the response for something. For now, try faking it
		const cc = new SupervisionCCReport({
			nodeId: NODE_ID_BROADCAST,
			sessionId: 0, // fake
			moreUpdatesFollow: false, // fake
			...(finalSupervisionResult as any),
		});
		const ret = new (driver.getSendDataSinglecastConstructor())({
			sourceNodeId: driver.ownNodeId,
			command: cc,
		});
		return ret;
	} else {
		return response;
	}
};

export function createMessageGenerator<TResponse extends Message = Message>(
	driver: Driver,
	ctx: CCEncodingContext,
	msg: Message,
	onMessageSent: (msg: Message, result: Message | undefined) => void,
): {
	generator: MessageGenerator;
	resultPromise: DeferredPromise<TResponse>;
} {
	const resultPromise = createDeferredPromise<TResponse>();

	const generator: MessageGenerator = {
		parent: undefined as any, // The transaction will set this field on creation
		current: undefined,
		self: undefined,
		reset: () => {
			generator.current = undefined;
			generator.self = undefined;
		},
		start: () => {
			async function* gen() {
				// Determine which message generator implementation should be used
				let implementation: MessageGeneratorImplementation<Message> =
					simpleMessageGenerator;
				if (isSendData(msg)) {
					if (!containsCC(msg)) {
						throw new ZWaveError(
							"Cannot create a message generator for a message that doesn't contain a command class",
							ZWaveErrorCodes.Argument_Invalid,
						);
					}
					if (
						msg.command instanceof Security2CCMessageEncapsulation
					) {
						implementation = (
							msg.command.isSinglecast()
								? secureMessageGeneratorS2
								: secureMessageGeneratorS2Multicast
						) as MessageGeneratorImplementation<Message>;
					} else if (
						msg.command instanceof SecurityCCCommandEncapsulation
					) {
						implementation =
							secureMessageGeneratorS0 as MessageGeneratorImplementation<
								Message
							>;
					} else if (msg.command.isSinglecast()) {
						implementation =
							maybeTransportServiceGenerator as MessageGeneratorImplementation<
								Message
							>;
					}
				}

				// Step through the generator so we can easily cancel it and don't
				// accidentally forget to unset this.current at the end
				const gen = implementation(driver, ctx, msg, onMessageSent);
				let sendResult: Message | undefined;
				let result: Message | undefined;
				while (true) {
					// This call passes the previous send result (if it exists already) to the generator and saves the
					// generated or returned message in `value`. When `done` is true, `value` contains the returned result of the message generator
					try {
						const { value, done } = await gen.next(sendResult!);
						if (done) {
							result = value;
							break;
						}

						// Pass the generated message to the driver and remember the result for the next iteration
						generator.current = value;
						sendResult = yield generator.current;
					} catch (e) {
						if (e instanceof Error) {
							// There was an actual error, reject the transaction
							resultPromise.reject(e);
						} else if (isTransmitReport(e) && !e.isOK()) {
							// The generator was prematurely ended by throwing a NOK transmit report.
							// The driver may want to retry it, so reset the generator
							generator.reset();
							return;
						} else {
							// The generator was prematurely ended by throwing a Message
							resultPromise.resolve(e as TResponse);
						}
						break;
					}
				}

				resultPromise.resolve(result as TResponse);
				generator.reset();
				return;
			}

			generator.self = gen();
			return generator.self;
		},
	};
	return { resultPromise, generator };
}
