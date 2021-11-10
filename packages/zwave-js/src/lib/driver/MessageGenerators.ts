import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import type { Message } from "../message/Message";
import type { Driver } from "./Driver";
import type { PartialTransaction } from "./Transaction";

export type MessageGeneratorImplementation = (
	/** A reference to the driver */
	driver: Driver,
	/** The "primary" message */
	message: Message,
	afterEach: (msg: Message) => void,
	cancellationToken: { canceled: boolean },
	resultPromise: DeferredPromise<Message | void>,
) => AsyncGenerator<PartialTransaction, void, void>;

/** A simple message generator for messages that don't require any handshake */
export const simpleMessageGenerator: MessageGeneratorImplementation =
	async function* (driver, msg, afterEach, cancellationToken, resultPromise) {
		if (cancellationToken.canceled) return;
		let response: Message | void;

		// Pass this message to the send thread and wait for it to be sent
		const promise = createDeferredPromise<Error | Message | void>();
		yield { message: msg, promise };
		try {
			const result = await promise;
			if (result instanceof Error) throw result;
			response = result;
		} catch (err) {
			resultPromise.reject(err);
		}
		if (cancellationToken.canceled) return;

		afterEach(msg);

		// If the sent message expects an update from the node, wait for it
		if (msg.expectsNodeUpdate()) {
			try {
				response = await driver.waitForMessage((received) => {
					return msg.isExpectedNodeUpdate(received);
				}, driver.options.timeouts.report);
			} catch (e) {
				resultPromise.reject(
					new ZWaveError(
						`Timed out while waiting for a response from the node`,
						ZWaveErrorCodes.Controller_NodeTimeout,
					),
				);
				if (cancellationToken.canceled) return;
			}
		}

		resultPromise.resolve(response);
	};
