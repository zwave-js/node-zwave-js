import { Bytes, getenv } from "@zwave-js/shared";
import { bootloaderMenuPreamble } from "../parsers/BootloaderParsers.js";
import { ZWaveSerialMode } from "../serialport/definitions.js";

const IS_TEST = process.env.NODE_ENV === "test" || !!getenv("CI");

// A transform stream with two outputs, where only one of both is
// active at the same time

export class SerialModeSwitch extends WritableStream<Uint8Array> {
	public mode: ZWaveSerialMode | undefined;

	// The output sides of the stream
	#serialAPIWriter: WritableStreamDefaultWriter<Uint8Array>;
	public readonly toSerialAPI: ReadableStream<Uint8Array>;

	#bootloaderWriter: WritableStreamDefaultWriter<Uint8Array>;
	public readonly toBootloader: ReadableStream<Uint8Array>;

	public constructor() {
		// Set up a writable stream for the input side of the public interface
		// which also handles dispatching the data to the correct output
		super({
			write: async (chunk) => {
				if (this.mode == undefined) {
					const buffer = Bytes.view(chunk);
					// If we haven't figured out the startup mode yet,
					// inspect the chunk to see if it contains the bootloader preamble
					const str = buffer.toString("ascii")
						// like .trim(), but including null bytes
						.replaceAll(/^[\s\0]+|[\s\0]+$/g, "");

					if (str.startsWith(bootloaderMenuPreamble)) {
						// We're sure we're in bootloader mode
						this.mode = ZWaveSerialMode.Bootloader;
					} else if (
						buffer.every((b) =>
							b === 0x00
							|| b === 0x0a
							|| b === 0x0d
							|| (b >= 0x20 && b <= 0x7e)
						) && buffer.some((b) => b >= 0x20 && b <= 0x7e)
					) {
						// Only printable line breaks, null bytes and at least one printable ASCII character
						// --> We're pretty sure we're in bootloader mode
						this.mode = ZWaveSerialMode.Bootloader;
					} else {
						// We're in Serial API mode
						this.mode = ZWaveSerialMode.SerialAPI;
					}
				}

				// On Windows, writing to the parsers immediately seems to lag the event loop
				// long enough that the state machine sometimes has not transitioned to the next state yet.
				// By using setImmediate, we "break" the work into manageable chunks.
				// We have some tests that don't like this though, so we don't do it in tests
				const write = async () => {
					if (this.mode === ZWaveSerialMode.Bootloader) {
						await this.#bootloaderWriter.write(chunk);
						await this.#bootloaderWriter.ready;
					} else {
						await this.#serialAPIWriter.write(chunk);
						await this.#serialAPIWriter.ready;
					}
				};

				if (IS_TEST) {
					await write();
				} else {
					setImmediate(write);
				}
			},
			abort: async (reason) => {
				// We need to abort our sinks so the error is propagated
				try {
					await this.#bootloaderWriter.abort(reason);
				} catch {
					// Don't care
				}
				try {
					await this.#serialAPIWriter.abort(reason);
				} catch {
					// Don't care
				}
			},
		});

		// Set put identity streams for the output side of the public interface
		const { readable: toSerialAPI, writable: outputSerialAPI } =
			new TransformStream();
		const { readable: toBootloader, writable: outputBootloader } =
			new TransformStream();
		this.toSerialAPI = toSerialAPI;
		this.#serialAPIWriter = outputSerialAPI.getWriter();
		this.toBootloader = toBootloader;
		this.#bootloaderWriter = outputBootloader.getWriter();
	}
}
