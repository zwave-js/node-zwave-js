import {
	type MessagePriority,
	TransmitStatus,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import {
	SendDataBridgeRequest,
	type SendDataBridgeRequestTransmitReport,
	SendDataMulticastBridgeRequest,
	type SendDataMulticastBridgeRequestTransmitReport,
} from "@zwave-js/serial/serialapi";
import {
	SendDataMulticastRequest,
	type SendDataMulticastRequestTransmitReport,
	SendDataRequest,
	type SendDataRequestTransmitReport,
} from "@zwave-js/serial/serialapi";
import {
	isSendData,
	isSendDataTransmitReport,
} from "@zwave-js/serial/serialapi";
import { getEnumMemberName } from "@zwave-js/shared";
import { type SerialAPICommandMachineFailure } from "./SerialAPICommandMachine.js";
import type { Transaction } from "./Transaction.js";

export function serialAPICommandErrorToZWaveError(
	reason: SerialAPICommandMachineFailure["reason"],
	sentMessage: Message,
	receivedMessage: Message | undefined,
	transactionSource: string | undefined,
): ZWaveError {
	switch (reason) {
		case "CAN":
		case "NAK":
			return new ZWaveError(
				`Failed to send the message after 3 attempts`,
				ZWaveErrorCodes.Controller_MessageDropped,
				undefined,
				transactionSource,
			);
		case "ACK timeout":
			return new ZWaveError(
				`Timeout while waiting for an ACK from the controller`,
				ZWaveErrorCodes.Controller_Timeout,
				"ACK",
				transactionSource,
			);
		case "response timeout":
			return new ZWaveError(
				`Timeout while waiting for a response from the controller`,
				ZWaveErrorCodes.Controller_Timeout,
				"response",
				transactionSource,
			);
		case "callback timeout":
			return new ZWaveError(
				`Timeout while waiting for a callback from the controller`,
				ZWaveErrorCodes.Controller_Timeout,
				"callback",
				transactionSource,
			);
		case "response NOK": {
			if (isSendData(sentMessage)) {
				return new ZWaveError(
					`Failed to send the command after ${sentMessage.maxSendAttempts} attempts. Transmission queue full`,
					ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
					transactionSource,
				);
			} else {
				return new ZWaveError(
					`The controller response indicated failure`,
					ZWaveErrorCodes.Controller_ResponseNOK,
					receivedMessage,
					transactionSource,
				);
			}
		}
		case "callback NOK": {
			if (
				isSendData(sentMessage)
				&& isSendDataTransmitReport(receivedMessage)
				&& receivedMessage.transmitStatus === TransmitStatus.Fail
			) {
				return new ZWaveError(
					`Failed to send the command, the controller is jammed`,
					ZWaveErrorCodes.Controller_Jammed,
					receivedMessage,
					transactionSource,
				);
			}

			if (
				sentMessage instanceof SendDataRequest
				|| sentMessage instanceof SendDataBridgeRequest
			) {
				const status = (
					receivedMessage as
						| SendDataRequestTransmitReport
						| SendDataBridgeRequestTransmitReport
				).transmitStatus;
				return new ZWaveError(
					`Failed to send the command after ${sentMessage.maxSendAttempts} attempts (Status ${
						getEnumMemberName(
							TransmitStatus,
							status,
						)
					})`,
					status === TransmitStatus.NoAck
						? ZWaveErrorCodes.Controller_CallbackNOK
						: ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
					transactionSource,
				);
			} else if (
				sentMessage instanceof SendDataMulticastRequest
				|| sentMessage instanceof SendDataMulticastBridgeRequest
			) {
				const status = (
					receivedMessage as
						| SendDataMulticastRequestTransmitReport
						| SendDataMulticastBridgeRequestTransmitReport
				).transmitStatus;
				return new ZWaveError(
					`One or more nodes did not respond to the multicast request (Status ${
						getEnumMemberName(
							TransmitStatus,
							status,
						)
					})`,
					status === TransmitStatus.NoAck
						? ZWaveErrorCodes.Controller_CallbackNOK
						: ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
					transactionSource,
				);
			} else {
				return new ZWaveError(
					`The controller callback indicated failure`,
					ZWaveErrorCodes.Controller_CallbackNOK,
					receivedMessage,
					transactionSource,
				);
			}
		}
	}
}

export function createMessageDroppedUnexpectedError(
	original: Error,
): ZWaveError {
	const ret = new ZWaveError(
		`Message dropped because of an unexpected error: ${original.message}`,
		ZWaveErrorCodes.Controller_MessageDropped,
	);
	if (original.stack) ret.stack = original.stack;
	return ret;
}

export type TransactionReducerResult =
	| {
		// Silently drop the transaction
		type: "drop";
	}
	| {
		// Do nothing (useful especially for the current transaction)
		type: "keep";
	}
	| {
		// Reject the transaction with the given error
		type: "reject";
		message: string;
		code: ZWaveErrorCodes;
	}
	| {
		// Resolve the transaction with the given message
		type: "resolve";
		message?: Message;
	}
	| {
		// Moves the transaction back to the queue, resetting it if desired.
		// Optionally change the priority and/or tag.
		type: "requeue";
		// TODO: Figure out if there's any situation where we don't want to reset the transaction
		reset?: boolean;
		priority?: MessagePriority;
		tag?: any;
	};

export type TransactionReducer = (
	transaction: Transaction,
	source: "queue" | "active",
) => TransactionReducerResult;

// TODO: Do we still need this?
// function computeRetryDelay(attempts: number): number {
// 	return 100 + 1000 * (attempts - 1);
// }
