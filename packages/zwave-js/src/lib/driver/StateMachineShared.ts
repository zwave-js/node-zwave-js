import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { getEnumMemberName } from "@zwave-js/shared";
import type { SendAction } from "xstate";
import { respond } from "xstate/lib/actions";
import {
	SendDataAbort,
	SendDataMulticastRequest,
	SendDataMulticastRequestTransmitReport,
	SendDataRequest,
	SendDataRequestTransmitReport,
	TransmitStatus,
} from "../controller/SendDataMessages";
import type { Message } from "../message/Message";
import type { SendDataErrorData } from "./SendThreadMachine";
import type { SerialAPICommandEvent } from "./SerialAPICommandMachine";

export interface ServiceImplementations {
	timestamp: () => number;
	sendData: (data: Buffer) => Promise<void>;
	createSendDataAbort: () => SendDataAbort;
	notifyRetry?: (
		command: "SendData" | "SerialAPI",
		message: Message,
		attempts: number,
		maxAttempts: number,
		delay: number,
	) => void;
	notifyUnsolicited: (message: Message) => void;
}

export function respondUnexpected(type: string): SendAction<any, any, any> {
	return respond(
		(_: any, evt: SerialAPICommandEvent & { type: "message" }) => ({
			type,
			message: evt.message,
		}),
	);
}

export function serialAPIOrSendDataErrorToZWaveError(
	error: SendDataErrorData["reason"],
	sentMessage: Message,
	receivedMessage: Message | undefined,
): ZWaveError {
	switch (error) {
		case "send failure":
		case "CAN":
		case "NAK":
			return new ZWaveError(
				`Failed to send the message after 3 attempts`,
				ZWaveErrorCodes.Controller_MessageDropped,
			);
		case "ACK timeout":
			return new ZWaveError(
				`Timeout while waiting for an ACK from the controller`,
				ZWaveErrorCodes.Controller_Timeout,
			);
		case "response timeout":
			return new ZWaveError(
				`Timeout while waiting for a response from the controller`,
				ZWaveErrorCodes.Controller_Timeout,
			);
		case "callback timeout":
			return new ZWaveError(
				`Timeout while waiting for a callback from the controller`,
				ZWaveErrorCodes.Controller_Timeout,
			);
		case "response NOK":
			if (
				sentMessage instanceof SendDataRequest ||
				sentMessage instanceof SendDataMulticastRequest
			) {
				return new ZWaveError(
					`Failed to send the command after ${sentMessage.maxSendAttempts} attempts. Transmission queue full.`,
					ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
				);
			} else {
				return new ZWaveError(
					`The controller response indicated failure`,
					ZWaveErrorCodes.Controller_ResponseNOK,
					receivedMessage,
				);
			}
		case "callback NOK":
			if (sentMessage instanceof SendDataRequest) {
				const status = (receivedMessage as SendDataRequestTransmitReport)
					.transmitStatus;
				return new ZWaveError(
					`Failed to send the command after ${
						sentMessage.maxSendAttempts
					} attempts (Status ${getEnumMemberName(
						TransmitStatus,
						status,
					)})`,
					status === TransmitStatus.NoAck
						? ZWaveErrorCodes.Controller_NodeTimeout
						: ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
				);
			} else if (sentMessage instanceof SendDataMulticastRequest) {
				const status = (receivedMessage as SendDataMulticastRequestTransmitReport)
					.transmitStatus;
				return new ZWaveError(
					`One or more nodes did not respond to the multicast request (Status ${getEnumMemberName(
						TransmitStatus,
						status,
					)})`,
					status === TransmitStatus.NoAck
						? ZWaveErrorCodes.Controller_NodeTimeout
						: ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
				);
			} else {
				return new ZWaveError(
					`The controller callback indicated failure`,
					ZWaveErrorCodes.Controller_CallbackNOK,
					receivedMessage,
				);
			}
		case "node timeout":
			return new ZWaveError(
				`Timed out while waiting for a response from the node`,
				ZWaveErrorCodes.Controller_NodeTimeout,
				receivedMessage,
			);
	}
}

/** Tests whether the given error is one that was caused by the serial API execution */
export function isSerialCommandError(error: unknown): boolean {
	if (!(error instanceof ZWaveError)) return false;
	switch (error.code) {
		case ZWaveErrorCodes.Controller_Timeout:
		case ZWaveErrorCodes.Controller_ResponseNOK:
		case ZWaveErrorCodes.Controller_CallbackNOK:
		case ZWaveErrorCodes.Controller_MessageDropped:
			return true;
	}
	return false;
}
