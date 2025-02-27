import { Bytes, type Timer, setTimer } from "@zwave-js/shared";
import { type Transformer } from "node:stream/web";
import type { SerialLogger } from "../log/Logger.js";
import { XModemMessageHeaders } from "../message/MessageHeaders.js";
import {
	type CLIChunk,
	CLIChunkType,
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

export class CLIParser extends TransformStream<
	Uint8Array,
	ZWaveSerialFrame & { type: ZWaveSerialFrameType.CLI }
> {
	constructor(private logger?: SerialLogger) {
		let receiveBuffer = "";
		let flushTimeout: Timer | undefined;

		function wrapChunk(
			chunk: CLIChunk,
		): ZWaveSerialFrame & { type: ZWaveSerialFrameType.CLI } {
			return {
				type: ZWaveSerialFrameType.CLI,
				data: chunk,
			};
		}

		const transformer: Transformer<
			Uint8Array,
			ZWaveSerialFrame & { type: ZWaveSerialFrameType.CLI }
		> = {
			transform(chunk, controller) {
				flushTimeout?.clear();
				flushTimeout = undefined;

				receiveBuffer += Bytes.view(chunk).toString("utf8");

				// Emit single flow-control bytes
				while (receiveBuffer.length > 0) {
					const charCode = receiveBuffer.charCodeAt(0);
					if (!isFlowControl(charCode)) break;

					logger?.data("inbound", Uint8Array.from([charCode]));
					controller.enqueue(wrapChunk({
						type: CLIChunkType.FlowControl,
						command: charCode,
					}));
					receiveBuffer = receiveBuffer.slice(1);
				}

				// Essentially, each interaction with the CLI outputs 1 or more lines of text, followed by "> " to indicate
				// that it's time for the user to input a command.
				// Logging typically begins with [I] (or possibly other characters inside square brackets)
				// When logging is involved, the log line may be output after the prompt due to a delay, e.g. "> [I] some log"

				// We emit this as a message, followed by a prompt
				if (receiveBuffer.includes("> ")) {
					// There is a prompt input, that means the output is complete
					const output = receiveBuffer.split("\n").map(
						(line) => line.startsWith("> ") ? line.slice(2) : line,
					).join("\n").trim();

					if (output) {
						logger?.message(output, "inbound");
						controller.enqueue(wrapChunk({
							type: CLIChunkType.Message,
							message: output,
						}));
					}

					controller.enqueue(wrapChunk({
						type: CLIChunkType.Prompt,
					}));

					receiveBuffer = "";
				} else if (/^\[[A-Z]\] /.test(receiveBuffer)) {
					// This is an "unsolicited" log message
					logger?.message(receiveBuffer, "inbound");
					controller.enqueue(wrapChunk({
						type: CLIChunkType.Message,
						message: receiveBuffer,
					}));
					receiveBuffer = "";
				}

				// If a partial output is kept for a certain amount of time, emit it as a message
				if (receiveBuffer) {
					flushTimeout = setTimer(() => {
						flushTimeout = undefined;
						logger?.message(receiveBuffer, "inbound");
						controller.enqueue(wrapChunk({
							type: CLIChunkType.Message,
							message: receiveBuffer,
						}));
						receiveBuffer = "";
					}, 500);
				}
			},
		};

		super(transformer);
	}
}
