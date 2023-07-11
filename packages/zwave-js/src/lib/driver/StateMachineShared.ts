import {
	TransmitStatus,
	ZWaveError,
	ZWaveErrorCodes,
	isZWaveError,
	type MessagePriority,
} from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import {
	Interpreter,
	type AnyStateMachine,
	type InterpreterFrom,
	type InterpreterOptions,
} from "xstate";
import {
	SendDataBridgeRequest,
	SendDataMulticastBridgeRequest,
	type SendDataBridgeRequestTransmitReport,
	type SendDataMulticastBridgeRequestTransmitReport,
} from "../serialapi/transport/SendDataBridgeMessages";
import {
	SendDataMulticastRequest,
	SendDataRequest,
	type SendDataMulticastRequestTransmitReport,
	type SendDataRequestTransmitReport,
} from "../serialapi/transport/SendDataMessages";
import { isSendData } from "../serialapi/transport/SendDataShared";
import type { SerialAPICommandDoneData } from "./SerialAPICommandMachine";
import type { Transaction } from "./Transaction";

export function serialAPICommandErrorToZWaveError(
	reason: (SerialAPICommandDoneData & { type: "failure" })["reason"],
	sentMessage: Message,
	receivedMessage: Message | undefined,
	transactionSource: string | undefined,
): ZWaveError {
	switch (reason) {
		case "send failure":
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
				sentMessage instanceof SendDataRequest ||
				sentMessage instanceof SendDataBridgeRequest
			) {
				const status = (
					receivedMessage as
						| SendDataRequestTransmitReport
						| SendDataBridgeRequestTransmitReport
				).transmitStatus;
				return new ZWaveError(
					`Failed to send the command after ${
						sentMessage.maxSendAttempts
					} attempts (Status ${getEnumMemberName(
						TransmitStatus,
						status,
					)})`,
					status === TransmitStatus.NoAck
						? ZWaveErrorCodes.Controller_CallbackNOK
						: ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
					transactionSource,
				);
			} else if (
				sentMessage instanceof SendDataMulticastRequest ||
				sentMessage instanceof SendDataMulticastBridgeRequest
			) {
				const status = (
					receivedMessage as
						| SendDataMulticastRequestTransmitReport
						| SendDataMulticastBridgeRequestTransmitReport
				).transmitStatus;
				return new ZWaveError(
					`One or more nodes did not respond to the multicast request (Status ${getEnumMemberName(
						TransmitStatus,
						status,
					)})`,
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
		case "aborted": {
			return new ZWaveError(
				`The transaction was aborted`,
				ZWaveErrorCodes.Controller_CommandAborted,
				undefined,
				transactionSource,
			);
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

/** Tests whether the given error is one that was caused by the serial API execution */
export function isSerialCommandError(error: unknown): boolean {
	if (!isZWaveError(error)) return false;
	switch (error.code) {
		case ZWaveErrorCodes.Controller_Timeout:
		case ZWaveErrorCodes.Controller_ResponseNOK:
		case ZWaveErrorCodes.Controller_CallbackNOK:
		case ZWaveErrorCodes.Controller_MessageDropped:
			return true;
	}
	return false;
}

export type ExtendedInterpreterFrom<
	TMachine extends AnyStateMachine | ((...args: any[]) => AnyStateMachine),
> = Extended<InterpreterFrom<TMachine>>;

export type Extended<
	TInterpreter extends Interpreter<any, any, any, any, any>,
> = TInterpreter & {
	restart(): TInterpreter;
};

/** Extends the default xstate interpreter with a restart function that re-attaches all event handlers */
export function interpretEx<TMachine extends AnyStateMachine>(
	machine: TMachine,
	options?: Partial<InterpreterOptions>,
): ExtendedInterpreterFrom<TMachine> {
	const interpreter = new Interpreter(
		machine,
		options,
	) as ExtendedInterpreterFrom<TMachine>;

	return new Proxy(interpreter, {
		get(target, key) {
			if (key === "restart") {
				return () => {
					const listeners = [...(target["listeners"] as Set<any>)];
					const contextListeners = [
						...(target["contextListeners"] as Set<any>),
					];
					const stopListeners = [
						...(target["stopListeners"] as Set<any>),
					];
					const doneListeners = [
						...(target["doneListeners"] as Set<any>),
					];
					const eventListeners = [
						...(target["eventListeners"] as Set<any>),
					];
					const sendListeners = [
						...(target["sendListeners"] as Set<any>),
					];
					target.stop();
					for (const listener of listeners)
						target.onTransition(listener);
					for (const listener of contextListeners)
						target.onChange(listener);
					for (const listener of stopListeners)
						target.onStop(listener);
					for (const listener of doneListeners)
						target.onDone(listener);
					for (const listener of eventListeners)
						target.onEvent(listener);
					for (const listener of sendListeners)
						target.onSend(listener);
					return target.start();
				};
			} else {
				return (target as any)[key];
			}
		},
	});
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
			// Changes the priority (and tag) of the transaction if a new one is given,
			// and moves the current transaction back to the queue
			type: "requeue";
			priority?: MessagePriority;
			tag?: any;
	  };

export type TransactionReducer = (
	transaction: Transaction,
	source: "queue" | "active",
) => TransactionReducerResult;
