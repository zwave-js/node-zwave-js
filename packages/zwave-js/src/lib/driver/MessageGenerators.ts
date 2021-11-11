import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { CommandClass } from "../commandclass";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import {
	SecurityCCCommandEncapsulation,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "../commandclass/SecurityCC";
import { isSendData } from "../controller/SendDataShared";
import type { Message } from "../message/Message";
import type { Driver, SendCommandOptions } from "./Driver";

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
					"No nonce received from the node",
					ZWaveErrorCodes.Controller_NodeTimeout,
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

		// Now send the actual secure command:
		msg.command.nonceId = nonceId;
		return yield* simpleMessageGenerator(driver, msg, afterEach);
	};
