import { SPANState, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import {
	CommandClass,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
} from "../commandclass";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import {
	SecurityCCCommandEncapsulation,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "../commandclass/SecurityCC";
import {
	isSendData,
	isTransmitReport,
} from "../serialapi/transport/SendDataShared";
import type { Driver, SendCommandOptions } from "./Driver";
import { sendDataErrorToZWaveError } from "./StateMachineShared";
import type { MessageGenerator } from "./Transaction";

export type MessageGeneratorImplementation = (
	/** A reference to the driver */
	driver: Driver,
	/** The "primary" message */
	message: Message,
	/**
	 * A hook to get notified about each sent message and the result of the Serial API call
	 * without waiting for the message generator to finish completely.
	 */
	onMessageSent: (msg: Message, result: Message | undefined) => void,

	/** Can be used to extend the timeout waiting for a response from a node to the sent message */
	additionalCommandTimeoutMs?: number,
) => AsyncGenerator<Message, Message, Message>;

export async function waitForNodeUpdate<T extends Message>(
	driver: Driver,
	msg: Message,
	timeoutMs: number,
): Promise<T> {
	try {
		return await driver.waitForMessage<T>((received) => {
			return msg.isExpectedNodeUpdate(received);
		}, timeoutMs);
	} catch (e) {
		throw new ZWaveError(
			`Timed out while waiting for a response from the node`,
			ZWaveErrorCodes.Controller_NodeTimeout,
		);
	}
}

/** A simple message generator that simply sends a message, waits for the ACK (and the response if one is expected) */
export const simpleMessageGenerator: MessageGeneratorImplementation =
	async function* (
		driver,
		msg,
		onMessageSent,
		additionalCommandTimeoutMs = 0,
	) {
		// Pass this message to the send thread and wait for it to be sent
		let result: Message;
		let commandTimeMs: number;
		try {
			// The yield can throw and must be handled here
			result = yield msg;

			// Figure out how long the message took to be handled
			msg.markAsCompleted();
			commandTimeMs = Math.ceil(msg.rtt! / 1e6);

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
			throw result;
		}

		// If the sent message expects an update from the node, wait for it
		if (msg.expectsNodeUpdate()) {
			// CommandTime is measured by the application
			// ReportTime timeout SHOULD be set to CommandTime + 1 second.
			const timeout =
				commandTimeMs +
				driver.options.timeouts.report +
				additionalCommandTimeoutMs;
			return waitForNodeUpdate(driver, msg, timeout);
		}

		return result;
	};

/** A simple (internal) generator that simply sends a command, and optionally returns the response command */
async function* sendCommandGenerator<
	TResponse extends CommandClass = CommandClass,
>(
	driver: Driver,
	command: CommandClass,
	onMessageSent: (msg: Message, result: Message | undefined) => void,
	options: SendCommandOptions,
) {
	const msg = driver.createSendDataMessage(command, options);

	const resp = yield* simpleMessageGenerator(driver, msg, onMessageSent);
	if (resp && isCommandClassContainer(resp)) {
		driver.unwrapCommands(resp);
		return resp.command as TResponse;
	}
}

/** A message generator for security encapsulated messages (S0) */
export const secureMessageGeneratorS0: MessageGeneratorImplementation =
	async function* (driver, msg, onMessageSent) {
		if (!isSendData(msg)) {
			throw new ZWaveError(
				"Cannot use the S0 message generator for a command that's not a SendData message!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (typeof msg.command.nodeId !== "number") {
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
		let nonce: Buffer | undefined = secMan.getFreeNonce(nodeId);
		if (!nonce) {
			// No free nonce, request a new one
			const cc = new SecurityCCNonceGet(driver, {
				nodeId: nodeId,
				endpoint: msg.command.endpointIndex,
			});
			const nonceResp =
				yield* sendCommandGenerator<SecurityCCNonceReport>(
					driver,
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
			msg,
			onMessageSent,
			additionalTimeoutMs,
		);
	};

/** A message generator for security encapsulated messages (S2) */
export const secureMessageGeneratorS2: MessageGeneratorImplementation =
	async function* (driver, msg, onMessageSent) {
		if (!isSendData(msg)) {
			throw new ZWaveError(
				"Cannot use the S2 message generator for a command that's not a SendData message!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (typeof msg.command.nodeId !== "number") {
			throw new ZWaveError(
				"Cannot use the S2 message generator for multicast commands!", // (yet)
				ZWaveErrorCodes.Argument_Invalid,
			);
		} else if (!(msg.command instanceof Security2CCMessageEncapsulation)) {
			throw new ZWaveError(
				"The S2 message generator can only be used for Security S2 command encapsulation!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		const secMan = driver.securityManager2!;
		const nodeId = msg.command.nodeId;
		const spanState = secMan.getSPANState(nodeId);
		let additionalTimeoutMs: number | undefined;

		if (
			spanState.type === SPANState.None ||
			spanState.type === SPANState.LocalEI
		) {
			// Request a new nonce

			// No free nonce, request a new one
			const cc = new Security2CCNonceGet(driver, {
				nodeId: nodeId,
				endpoint: msg.command.endpointIndex,
			});
			const nonceResp =
				yield* sendCommandGenerator<Security2CCNonceReport>(
					driver,
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
		let response = yield* simpleMessageGenerator(
			driver,
			msg,
			onMessageSent,
			additionalTimeoutMs,
		);
		if (
			isCommandClassContainer(response) &&
			response.command instanceof Security2CCNonceReport
		) {
			const command = response.command;
			if (command.SOS && command.receiverEI) {
				// The node couldn't decrypt the last command we sent it. Invalidate
				// the shared SPAN, since it did the same
				secMan.storeRemoteEI(nodeId, command.receiverEI);
			}
			driver.controllerLog.logNode(nodeId, {
				message: `failed to decode the message, retrying with SPAN extension...`,
				direction: "none",
			});
			// Prepare the messsage for re-transmission
			msg.callbackId = undefined;
			msg.command.unsetSequenceNumber();

			// Send the message again
			response = yield* simpleMessageGenerator(
				driver,
				msg,
				onMessageSent,
				additionalTimeoutMs,
			);
			if (
				isCommandClassContainer(response) &&
				response.command instanceof Security2CCNonceReport
			) {
				// No dice
				driver.controllerLog.logNode(nodeId, {
					message: `failed to decode the message after re-transmission with SPAN extension, dropping the message.`,
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

export function createMessageGenerator<TResponse extends Message = Message>(
	driver: Driver,
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
		start: () => {
			const resetGenerator = () => {
				generator.current = undefined;
				generator.self = undefined;
			};

			async function* gen() {
				// Determine which message generator implemenation should be used
				let implementation: MessageGeneratorImplementation =
					simpleMessageGenerator;
				if (isSendData(msg)) {
					if (
						msg.command instanceof Security2CCMessageEncapsulation
					) {
						implementation = secureMessageGeneratorS2;
					} else if (
						msg.command instanceof SecurityCCCommandEncapsulation
					) {
						implementation = secureMessageGeneratorS0;
					}
				}

				// Step through the generator so we can easily cancel it and don't
				// accidentally forget to unset this.current at the end
				const gen = implementation(driver, msg, onMessageSent);
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

						// Pass the generated message to the transaction machine and remember the result for the next iteration
						generator.current = value;
						sendResult = yield generator.current;
					} catch (e) {
						if (e instanceof Error) {
							// There was an actual error, reject the transaction
							resultPromise.reject(e);
						} else if (isTransmitReport(e) && !e.isOK()) {
							// The generator was prematurely ended by throwing a NOK transmit report.
							// If this cannot be handled (e.g. by moving the messages to the wakeup queue), we need
							// to treat this as an error
							if (
								driver.handleMissingNodeACK(
									generator.parent as any,
								)
							) {
								resetGenerator();
								return;
							} else {
								resultPromise.reject(
									sendDataErrorToZWaveError(
										"callback NOK",
										generator.parent,
										e,
									),
								);
							}
						} else {
							// The generator was prematurely ended by throwing a Message
							resultPromise.resolve(e as TResponse);
						}
						break;
					}
				}

				resultPromise.resolve(result as TResponse);
				resetGenerator();
				return;
			}
			generator.self = gen();
			return generator.self;
		},
	};
	return { resultPromise, generator };
}
