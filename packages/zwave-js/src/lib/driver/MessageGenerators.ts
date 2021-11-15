import { SPANState, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
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
import { isSendData } from "../controller/SendDataShared";
import type { Message } from "../message/Message";
import type { Driver, SendCommandOptions } from "./Driver";
import type { MessageGenerator } from "./Transaction";

export type MessageGeneratorImplementation = (
	/** A reference to the driver */
	driver: Driver,
	/** The "primary" message */
	message: Message,
	afterEach: (msg: Message) => void,
) => AsyncGenerator<Message, Message, Message>;

export async function waitForNodeUpdate<T extends Message>(
	driver: Driver,
	msg: Message,
): Promise<T> {
	try {
		return await driver.waitForMessage<T>((received) => {
			return msg.isExpectedNodeUpdate(received);
		}, driver.options.timeouts.report);
	} catch (e) {
		throw new ZWaveError(
			`Timed out while waiting for a response from the node`,
			ZWaveErrorCodes.Controller_NodeTimeout,
		);
	}
}

/** A simple message generator that simply sends a message, waits for the ACK (and the response if one is expected) */
export const simpleMessageGenerator: MessageGeneratorImplementation =
	async function* (driver, msg, afterEach) {
		// Pass this message to the send thread and wait for it to be sent
		let result: Message;
		try {
			// The yield can throw and must be handled here
			result = yield msg;
			afterEach(msg);
		} catch (e) {
			throw e;
		}

		// If the sent message expects an update from the node, wait for it
		if (msg.expectsNodeUpdate()) {
			return waitForNodeUpdate(driver, msg);
		}

		return result;
	};

/** A simple (internal) generator that simply sends a command, and optionally returns the response command */
async function* sendCommandGenerator<
	TResponse extends CommandClass = CommandClass,
>(
	driver: Driver,
	command: CommandClass,
	afterEach: (msg: Message) => void,
	options: SendCommandOptions,
) {
	const msg = driver.createSendDataMessage(command, options);

	const resp = yield* simpleMessageGenerator(driver, msg, afterEach);
	if (resp && isCommandClassContainer(resp)) {
		driver.unwrapCommands(resp);
		return resp.command as TResponse;
	}
}

/** A message generator for security encapsulated messages (S0) */
export const secureMessageGeneratorS0: MessageGeneratorImplementation =
	async function* (driver, msg, afterEach) {
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
		let nonceId: number;

		// Try to get a free nonce before requesting a new one
		const freeNonce = secMan.getFreeNonce(nodeId);
		if (freeNonce) {
			nonceId = secMan.getNonceId(freeNonce);
		} else {
			// No free nonce, request a new one
			const cc = new SecurityCCNonceGet(driver, {
				nodeId: nodeId,
				endpoint: msg.command.endpointIndex,
			});
			const nonceResp =
				yield* sendCommandGenerator<SecurityCCNonceReport>(
					driver,
					cc,
					afterEach,
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
			const nonce = nonceResp.nonce;
			// and store it
			nonceId = secMan.getNonceId(nonce);
			secMan.setNonce(
				{
					issuer: nodeId,
					nonceId: nonceId,
				},
				{ nonce, receiver: driver.controller.ownNodeId! },
				// The nonce is reserved for this command
				{ free: false },
			);
		}

		// Now send the actual secure command
		msg.command.nonceId = nonceId;
		return yield* simpleMessageGenerator(driver, msg, afterEach);
	};

/** A message generator for security encapsulated messages (S2) */
export const secureMessageGeneratorS2: MessageGeneratorImplementation =
	async function* (driver, msg, afterEach) {
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
					afterEach,
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
		let response = yield* simpleMessageGenerator(driver, msg, afterEach);
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
			response = yield* simpleMessageGenerator(driver, msg, afterEach);
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
	afterEach: (msg: Message) => void,
): {
	generator: MessageGenerator;
	resultPromise: DeferredPromise<TResponse>;
} {
	const resultPromise = createDeferredPromise<TResponse>();

	// TODO: remove this when done debugging
	// const suffix = ` Node ${msg.getNodeId()?.toString()}, ${
	// 	isCommandClassContainer(msg)
	// 		? msg.command.constructor.name
	// 		: getEnumMemberName(FunctionType, msg.functionType)
	// }, callback ID: ${msg.needsCallbackId() && msg.callbackId}`;

	const generator: MessageGenerator = {
		current: undefined,
		self: undefined,
		start: () => {
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
				const gen = implementation(driver, msg, afterEach);
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
						} else {
							// The generator was prematurely ended by throwing a Message
							resultPromise.resolve(e as TResponse);
						}
						break;
					}
				}

				// TODO: remove this when done debugging
				// driver.driverLog.print("message generator done!" + suffix);
				resultPromise.resolve(result as TResponse);
				generator.current = undefined;
				generator.self = undefined;
				return;
			}
			generator.self = gen();
			return generator.self;
		},
	};
	return { resultPromise, generator };
}
