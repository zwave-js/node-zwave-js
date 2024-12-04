import { type MessageHeaders } from "../message/MessageHeaders.js";

export type ZWaveSerialChunk =
	| MessageHeaders.ACK
	| MessageHeaders.NAK
	| MessageHeaders.CAN
	| Uint8Array;

export enum ZWaveSerialMode {
	SerialAPI,
	Bootloader,
}
