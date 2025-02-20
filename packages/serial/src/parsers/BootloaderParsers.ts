import { Bytes, type Timer, setTimer } from "@zwave-js/shared";
import { type Transformer } from "node:stream/web";
import type { SerialLogger } from "../log/Logger.js";
import { XModemMessageHeaders } from "../message/MessageHeaders.js";
import {
	type BootloaderChunk,
	BootloaderChunkType,
	type ZWaveSerialFrame,
	ZWaveSerialFrameType,
} from "./ZWaveSerialFrame.js";

function isFlowControl(byte: number): boolean {
	return (
		byte === XModemMessageHeaders.ACK
		|| byte === XModemMessageHeaders.NAK
		|| byte === XModemMessageHeaders.CAN
		|| byte === XModemMessageHeaders.C
	);
}

class BootloaderScreenParserTransformer
	implements Transformer<Uint8Array, number | string>
{
	constructor(private logger?: SerialLogger) {}

	private receiveBuffer = "";
	private flushTimeout: Timer | undefined;

	transform(
		chunk: Uint8Array,
		controller: TransformStreamDefaultController<number | string>,
	) {
		this.flushTimeout?.clear();
		this.flushTimeout = undefined;

		this.receiveBuffer += Bytes.view(chunk).toString("utf8");

		// Correct buggy ordering of NUL char in error codes.
		// The bootloader may send errors as "some error 0x\012" instead of "some error 0x12\0"
		this.receiveBuffer = this.receiveBuffer.replaceAll(
			/(error 0x)\0([0-9a-f]+)/gi,
			"$1$2\0",
		);

		// Emit all full "screens"
		let nulCharIndex: number;
		while ((nulCharIndex = this.receiveBuffer.indexOf("\0")) > -1) {
			const screen = this.receiveBuffer.slice(0, nulCharIndex).trim();
			this.receiveBuffer = this.receiveBuffer.slice(nulCharIndex + 1);

			if (screen === "") continue;

			this.logger?.bootloaderScreen(screen);
			controller.enqueue(screen);
		}

		// Emit single flow-control bytes
		while (this.receiveBuffer.length > 0) {
			const charCode = this.receiveBuffer.charCodeAt(0);
			if (!isFlowControl(charCode)) break;

			this.logger?.data("inbound", Uint8Array.from([charCode]));
			controller.enqueue(charCode);
			this.receiveBuffer = this.receiveBuffer.slice(1);
		}

		// If a partial output is kept for a certain amount of time, emit it aswell
		if (this.receiveBuffer) {
			this.flushTimeout = setTimer(() => {
				this.flushTimeout = undefined;
				controller.enqueue(this.receiveBuffer);
				this.receiveBuffer = "";
			}, 500);
		}
	}
}

/** Parses the screen output from the bootloader, either waiting for a NUL char or a timeout */
export class BootloaderScreenParser
	extends TransformStream<Uint8Array, number | string>
{
	constructor(
		logger?: SerialLogger,
	) {
		super(new BootloaderScreenParserTransformer(logger));
	}
}

// Sometimes the first chunk of the bootloader screen is relatively short,
// so we consider the following enough to detect the bootloader menu:
export const bootloaderMenuPreamble = "Gecko Boo";
const preambleRegex = /^Gecko Bootloader v(?<version>\d+\.\d+\.\d+)/;
const menuSuffix = "BL >";
const optionsRegex = /^(?<num>\d+)\. (?<option>.+)/gm;

/** Transforms the bootloader screen output into meaningful chunks */
export class BootloaderParser extends TransformStream<
	number | string,
	ZWaveSerialFrame & { type: ZWaveSerialFrameType.Bootloader }
> {
	constructor() {
		function wrapChunk(
			chunk: BootloaderChunk,
		): ZWaveSerialFrame & { type: ZWaveSerialFrameType.Bootloader } {
			return {
				type: ZWaveSerialFrameType.Bootloader,
				data: chunk,
			};
		}
		const transformer: Transformer<
			number | string,
			ZWaveSerialFrame & { type: ZWaveSerialFrameType.Bootloader }
		> = {
			transform(chunk, controller) {
				// Flow control bytes come in as numbers
				if (typeof chunk === "number") {
					controller.enqueue(wrapChunk({
						type: BootloaderChunkType.FlowControl,
						command: chunk,
					}));
					return;
				}

				let screen = chunk.trim();

				// Apparently, the bootloader sometimes sends \0 in the wrong location.
				// Therefore check if the screen contains the menu preamble, instead of forcing
				// it to start with it
				const menuPreambleIndex = screen.indexOf(
					bootloaderMenuPreamble,
				);

				if (menuPreambleIndex > -1 && screen.endsWith(menuSuffix)) {
					screen = screen.slice(menuPreambleIndex);
					const version = preambleRegex.exec(screen)?.groups?.version;
					if (!version) {
						controller.enqueue(wrapChunk({
							type: BootloaderChunkType.Error,
							error: "Could not determine bootloader version",
							_raw: screen,
						}) /* satisfies BootloaderChunk */);
						return;
					}

					const options: { num: number; option: string }[] = [];
					let match: RegExpExecArray | null;
					while ((match = optionsRegex.exec(screen)) !== null) {
						options.push({
							num: parseInt(match.groups!.num),
							option: match.groups!.option,
						});
					}

					controller.enqueue(
						wrapChunk({
							type: BootloaderChunkType.Menu,
							_raw: screen,
							version,
							options,
						}), /* satisfies BootloaderChunk */
					);
				} else {
					// Some output
					controller.enqueue(
						wrapChunk({
							type: BootloaderChunkType.Message,
							_raw: screen,
							message: screen,
						}), /* satisfies BootloaderChunk */
					);
				}
			},
		};

		super(transformer);
	}
}
