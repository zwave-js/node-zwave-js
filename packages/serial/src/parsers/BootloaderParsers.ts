import { Transform, TransformCallback } from "stream";
import type { SerialLogger } from "../Logger";
import { XModemMessageHeaders } from "../MessageHeaders";

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

function isFlowControl(byte: number): boolean {
	return (
		byte === XModemMessageHeaders.ACK ||
		byte === XModemMessageHeaders.NAK ||
		byte === XModemMessageHeaders.CAN ||
		byte === XModemMessageHeaders.C
	);
}

/** Parses the screen output from the bootloader, either waiting for a NUL char or a timeout */
export class BootloaderScreenParser extends Transform {
	constructor(private logger?: SerialLogger) {
		// We read byte streams but emit messages
		super({ readableObjectMode: true });
	}

	private receiveBuffer = "";
	private flushTimeout: NodeJS.Timeout | undefined;

	_transform(
		chunk: any,
		encoding: string,
		callback: TransformCallback,
	): void {
		if (this.flushTimeout) {
			clearTimeout(this.flushTimeout);
			this.flushTimeout = undefined;
		}

		this.receiveBuffer += chunk.toString("utf8");

		// Correct buggy ordering of NUL char in error codes.
		// The bootloader may send errors as "some error 0x\012" instead of "some error 0x12\0"
		this.receiveBuffer = this.receiveBuffer.replace(
			/(error 0x)\0([0-9a-f]+)/gi,
			"$1$2\0",
		);

		// Emit all full "screens"
		let nulCharIndex: number;
		while ((nulCharIndex = this.receiveBuffer.indexOf("\0")) > -1) {
			const line = this.receiveBuffer.slice(0, nulCharIndex).trim();
			this.receiveBuffer = this.receiveBuffer.slice(nulCharIndex + 1);
			this.push(line);
		}

		// Emit single flow-control bytes
		while (this.receiveBuffer.length > 0) {
			const charCode = this.receiveBuffer.charCodeAt(0);
			if (!isFlowControl(charCode)) break;

			this.logger?.data("inbound", Buffer.from([charCode]));
			this.push(charCode);
			this.receiveBuffer = this.receiveBuffer.slice(1);
		}

		// If a partial output is kept for a certain amount of time, emit it aswell
		if (this.receiveBuffer) {
			this.flushTimeout = setTimeout(() => {
				this.flushTimeout = undefined;
				this.push(this.receiveBuffer);
				this.receiveBuffer = "";
			}, 500);
		}

		callback();
	}
}

export const bootloaderMenuPreamble = "Gecko Bootloader";
const preambleRegex = /^Gecko Bootloader v(?<version>\d+\.\d+\.\d+)/;
const menuSuffix = "BL >";
const optionsRegex = /^(?<num>\d+)\. (?<option>.+)/gm;

/** Transforms the bootloader screen output into meaningful chunks */
export class BootloaderParser extends Transform {
	constructor() {
		// We read strings and return objects
		super({ objectMode: true });
	}

	_transform(
		chunk: any,
		encoding: string,
		callback: TransformCallback,
	): void {
		// Flow control bytes come in as numbers
		if (typeof chunk === "number") {
			return callback(
				null,
				{
					type: BootloaderChunkType.FlowControl,
					command: chunk,
				} /* satisfies BootloaderChunk */,
			);
		}

		let screen = (chunk as string).trim();

		// Apparently, the bootloader sometimes sends \0 in the wrong location.
		// Therefore check if the screen contains the menu preamble, instead of forcing
		// it to start with it
		const menuPreambleIndex = screen.indexOf(bootloaderMenuPreamble);

		if (menuPreambleIndex > -1 && screen.endsWith(menuSuffix)) {
			screen = screen.slice(menuPreambleIndex);
			const version = preambleRegex.exec(screen)?.groups?.version;
			if (!version) {
				return callback(
					null,
					{
						type: BootloaderChunkType.Error,
						error: "Could not determine bootloader version",
						_raw: screen,
					} /* satisfies BootloaderChunk */,
				);
			}

			const options: { num: number; option: string }[] = [];
			let match: RegExpExecArray | null;
			while ((match = optionsRegex.exec(screen)) !== null) {
				options.push({
					num: parseInt(match.groups!.num),
					option: match.groups!.option,
				});
			}

			this.push(
				{
					type: BootloaderChunkType.Menu,
					_raw: screen,
					version,
					options,
				} /* satisfies BootloaderChunk */,
			);
		} else {
			// Some output
			this.push(
				{
					type: BootloaderChunkType.Message,
					_raw: screen,
					message: screen,
				} /* satisfies BootloaderChunk */,
			);
		}

		callback();
	}
}
