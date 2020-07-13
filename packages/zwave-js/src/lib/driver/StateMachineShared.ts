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
import type {
	SerialAPICommandError,
	SerialAPICommandEvent,
} from "./SerialAPICommandMachine";

export interface ServiceImplementations {
	sendData: (data: Buffer) => Promise<void>;
	createSendDataAbort: () => SendDataAbort;
	notifyRetry?: (
		attempts: number,
		maxAttempts: number,
		delay: number,
	) => void;
}

export function respondUnexpected(type: string): SendAction<any, any, any> {
	return respond(
		(_: any, evt: SerialAPICommandEvent & { type: "message" }) => ({
			type,
			message: evt.message,
		}),
	);
}

export function serialAPICommandErrorToZWaveError(
	error: SerialAPICommandError,
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
				return new ZWaveError(
					`Failed to send the command after ${
						sentMessage.maxSendAttempts
					} attempts (Status ${getEnumMemberName(
						TransmitStatus,
						(receivedMessage as SendDataRequestTransmitReport)
							.transmitStatus,
					)})`,
					ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
				);
			} else if (sentMessage instanceof SendDataMulticastRequest) {
				return new ZWaveError(
					`Failed to send the command after ${
						sentMessage.maxSendAttempts
					} attempts (Status ${getEnumMemberName(
						TransmitStatus,
						(receivedMessage as SendDataMulticastRequestTransmitReport)
							.transmitStatus,
					)})`,
					ZWaveErrorCodes.Controller_MessageDropped,
					receivedMessage,
				);
			} else {
				return new ZWaveError(
					`The controller callback indicated failure`,
					ZWaveErrorCodes.Controller_CallbackNOK,
					receivedMessage,
				);
			}
	}
}
