import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { SendDataAbort } from "../controller/SendDataMessages";
import type { Message } from "../message/Message";
import type { SerialAPICommandError } from "./SerialAPICommandMachine";

export interface ServiceImplementations {
	sendData: (data: Buffer) => Promise<void>;
	createSendDataAbort: () => SendDataAbort;
	notifyRetry?: (
		attempts: number,
		maxAttempts: number,
		delay: number,
	) => void;
}

export function serialAPICommandErrorToZWaveError(
	error: SerialAPICommandError,
	message?: Message,
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
			return new ZWaveError(
				`The controller response indicated failure`,
				ZWaveErrorCodes.Controller_ResponseNOK,
				message,
			);
		case "callback NOK":
			return new ZWaveError(
				`The controller callback indicated failure`,
				ZWaveErrorCodes.Controller_CallbackNOK,
				message,
			);
	}
}
