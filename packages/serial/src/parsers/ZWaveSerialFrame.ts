import { type Bytes } from "@zwave-js/shared";
import {
	type MessageHeaders,
	type XModemMessageHeaders,
} from "../message/MessageHeaders.js";

export enum ZWaveSerialFrameType {
	SerialAPI = 0,
	Bootloader = 1,
	CLI = 2,
	Discarded = 0xff,
}

export type ZWaveSerialFrame = {
	type: ZWaveSerialFrameType.SerialAPI;
	data: SerialAPIChunk;
} | {
	type: ZWaveSerialFrameType.Bootloader;
	data: BootloaderChunk;
} | {
	type: ZWaveSerialFrameType.CLI;
	data: CLIChunk;
} | {
	type: ZWaveSerialFrameType.Discarded;
	data: Uint8Array;
};

export type SerialAPIChunk =
	| Bytes
	| MessageHeaders.ACK
	| MessageHeaders.NAK
	| MessageHeaders.CAN;

export enum BootloaderChunkType {
	Error,
	Menu,
	Message,
	FlowControl,
}

export type BootloaderChunk =
	| {
		type: BootloaderChunkType.Error;
		error: string;
		_raw: string;
	}
	| {
		type: BootloaderChunkType.Menu;
		version: string;
		options: { num: number; option: string }[];
		_raw: string;
	}
	| {
		type: BootloaderChunkType.Message;
		message: string;
		_raw: string;
	}
	| {
		type: BootloaderChunkType.FlowControl;
		command:
			| XModemMessageHeaders.ACK
			| XModemMessageHeaders.NAK
			| XModemMessageHeaders.CAN
			| XModemMessageHeaders.C;
	};

export enum CLIChunkType {
	Prompt, // >
	Message,
	FlowControl,
}

export type CLIChunk =
	| {
		type: CLIChunkType.Prompt;
	}
	| {
		type: CLIChunkType.Message;
		message: string;
	}
	| {
		type: CLIChunkType.FlowControl;
		command:
			| XModemMessageHeaders.ACK
			| XModemMessageHeaders.NAK
			| XModemMessageHeaders.CAN
			| XModemMessageHeaders.C;
	};
