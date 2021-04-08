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

export enum TransmitOptions {
	NotSet = 0,

	ACK = 1 << 0,
	LowPower = 1 << 1,
	AutoRoute = 1 << 2,

	NoRoute = 1 << 4,
	Explore = 1 << 5,

	DEFAULT = ACK | AutoRoute | Explore,
}

export enum TransmitStatus {
	OK = 0x00, // Transmission complete and ACK received
	NoAck = 0x01, // Transmission complete, no ACK received
	Fail = 0x02, // Transmission failed
	NotIdle = 0x03, // Transmission failed, network busy
	NoRoute = 0x04, // Transmission complete, no return route
}

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
