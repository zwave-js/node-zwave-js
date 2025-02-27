import { type MessageHeaders } from "../message/MessageHeaders.js";

export type ZWaveSerialChunk =
	| MessageHeaders.ACK
	| MessageHeaders.NAK
	| MessageHeaders.CAN
	| Uint8Array;

export enum ZWaveSerialMode {
	// Controller or end device Serial API
	SerialAPI,
	// OTW Bootloader
	Bootloader,
	// Text-based SoC end device CLI
	CLI,
}
