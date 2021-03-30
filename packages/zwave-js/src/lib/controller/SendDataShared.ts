import {
	SendDataBridgeRequest,
	SendDataMulticastBridgeRequest,
} from "./SendDataBridgeMessages";
import { SendDataMulticastRequest, SendDataRequest } from "./SendDataMessages";

export type SendDataMessage =
	| SendDataRequest
	| SendDataMulticastRequest
	| SendDataBridgeRequest
	| SendDataMulticastBridgeRequest;

export function isSendData(msg: unknown): msg is SendDataMessage {
	if (!msg) return false;
	return (
		msg instanceof SendDataRequest ||
		msg instanceof SendDataMulticastRequest ||
		msg instanceof SendDataBridgeRequest ||
		msg instanceof SendDataMulticastBridgeRequest
	);
}

export function isSendDataSinglecast(
	msg: unknown,
): msg is SendDataRequest | SendDataBridgeRequest {
	if (!msg) return false;
	return (
		msg instanceof SendDataRequest || msg instanceof SendDataBridgeRequest
	);
}

export function isSendDataMulticast(
	msg: unknown,
): msg is SendDataMulticastRequest | SendDataMulticastBridgeRequest {
	if (!msg) return false;
	return (
		msg instanceof SendDataMulticastRequest ||
		msg instanceof SendDataMulticastBridgeRequest
	);
}
