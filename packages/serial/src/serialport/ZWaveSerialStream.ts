// This is basically a duplex transform stream wrapper around a
// readable and a writable stream, both compatible with the Web Streams API.
// This allows supporting different low-level connections to a Z-Wave controller,
// whether it's a serial port, a network connection, or something else.
//
// 0 ┌─────────────────┐ ┌─────────────────┐ ┌──
// 1 <--               <--   PassThrough   <-- write
// 1 │    any stream   │ │ ZWaveSerialPort │ │
// 0 -->               -->     Parsers     --> read
// 1 └─────────────────┘ └─────────────────┘ └──

import { type ZWaveLogContainer } from "@zwave-js/core";
import { isAbortError } from "@zwave-js/shared";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import {
	type ReadableWritablePair,
	type UnderlyingSink,
	type UnderlyingSource,
} from "node:stream/web";
import { ReadableStream } from "node:stream/web";
import { SerialLogger } from "../log/Logger.js";
import { MessageHeaders } from "../message/MessageHeaders.js";
import {
	BootloaderScreenWebParser,
	BootloaderWebParser,
} from "../parsers/BootloaderParsers.js";
import { SerialAPIWebParser } from "../parsers/SerialAPIParser.js";
import { SerialModeSwitch } from "../parsers/SerialModeSwitch.js";
import { type ZWaveSerialFrame } from "../parsers/ZWaveSerialFrame.js";
import { ZWaveSerialMode } from "./ZWaveSerialPortBase.js";

/** The low level bindings used by ZWaveSerialStream.
 * The `sink` is guaranteed to be opened first, so possible setup should be done in
 * the `start` method there. */
export interface ZWaveSerialBinding {
	sink: UnderlyingSink<Uint8Array>;
	source: UnderlyingSource<Uint8Array>;
}

export class ZWaveSerialStream implements
	ReadableWritablePair<
		// The serial binding emits ZWaveSerialFrames
		ZWaveSerialFrame,
		// and accepts binary data
		Uint8Array
	>
{
	constructor(
		bindings: ZWaveSerialBinding,
		loggers: ZWaveLogContainer,
	) {
		this.logger = new SerialLogger(loggers);

		// Set up streams for the underlying resource
		this.#source = new ReadableStream(bindings.source);
		this.#sink = new WritableStream(bindings.sink);

		// Set up an identity stream pair for the public interface of the writable stream
		const { readable: input, writable } = new TransformStream();
		this.writable = writable;
		this.#input = input;

		// Prepare parsers for reading from the serial port
		// -> Serial API mode
		this.parser = new SerialAPIWebParser(this.logger);

		// -> Bootloader mode
		// This one looks for NUL chars which terminate each bootloader output screen
		this.bootloaderScreenParser = new BootloaderScreenWebParser(
			this.logger,
		);
		// This one parses the bootloader output into a more usable format
		this.bootloaderParser = new BootloaderWebParser();

		// Mode switch
		this.modeSwitch = new SerialModeSwitch();

		// Prepare aborting the streams
		this.#abort = new AbortController();

		// Now set up the plumbing:
		//                       ┌>         parser         ┐
		// #source -> modeSwitch ┤                         ├> readable
		//                       └> BL screen -> BL parser ┘
		//
		// #sink                     <---                     writable

		const pipe1 = this.#source.pipeTo(
			this.modeSwitch,
			{ signal: this.#abort.signal },
		);

		const pipe2 = this.modeSwitch.toSerialAPI
			.pipeTo(this.parser.writable, { signal: this.#abort.signal });

		const pipe3 = this.modeSwitch.toBootloader
			.pipeThrough(
				this.bootloaderScreenParser,
				{ signal: this.#abort.signal },
			)
			.pipeTo(
				this.bootloaderParser.writable,
				{ signal: this.#abort.signal },
			);

		// Join the output streams from the parsers and expose it as the public readable stream
		this.readable = mergeReadableStreams(
			this.parser.readable,
			this.bootloaderParser.readable,
		);

		// Pipe the input stream to the sink - we do not modify written data
		const pipe4 = this.#input.pipeTo(
			this.#sink,
			{ signal: this.#abort.signal },
		);

		this.#pipePromise = Promise.allSettled([pipe1, pipe2, pipe3, pipe4]);
	}

	protected logger: SerialLogger;

	// Internal streams for accessing the underlying resource
	#sink: WritableStream<Uint8Array>;
	#source: ReadableStream<Uint8Array>;

	// Public interface to let consumers read from and write to this stream
	public readonly readable: ReadableStream<ZWaveSerialFrame>;
	public readonly writable: WritableStream<Uint8Array>;

	// Internal ends of the public interface
	#input: ReadableStream<Uint8Array>;

	// Signal to close the underlying stream
	#abort: AbortController;
	#pipePromise: Promise<any>;

	// Serial API parser
	private parser: SerialAPIWebParser;
	// Bootloader parsers
	private bootloaderScreenParser: BootloaderScreenWebParser;
	private bootloaderParser: BootloaderWebParser;

	// Allow switching between modes
	private modeSwitch: SerialModeSwitch;
	public get mode(): ZWaveSerialMode | undefined {
		return this.modeSwitch.mode;
	}
	public set mode(mode: ZWaveSerialMode | undefined) {
		this.modeSwitch.mode = mode;
	}

	// Allow ignoring the high nibble of an ACK once to work around an issue in the 700 series firmware
	public ignoreAckHighNibbleOnce(): void {
		this.parser.ignoreAckHighNibble = true;
	}

	public async open(): Promise<void> {
		// Try to write to the sink to make sure the underlying resource is not in an error state
		const writer = this.writable.getWriter();
		try {
			await writer.write(new Uint8Array());
			await writer.ready;
		} finally {
			writer.releaseLock();
		}

		this._isOpen = true;
	}

	public async close(): Promise<void> {
		this._isOpen = false;
		// Close the underlying stream
		this.#abort.abort();

		// Wait for streams to finish
		await this.#pipePromise;
	}

	private _isOpen: boolean = false;
	public get isOpen(): boolean {
		return this._isOpen;
	}

	public async writeAsync(data: Uint8Array): Promise<void> {
		if (!this.isOpen) {
			throw new Error("The serial port is not open!");
		}

		// Only log in Serial API mode
		if (this.mode === ZWaveSerialMode.SerialAPI && data.length === 1) {
			switch (data[0]) {
				case MessageHeaders.ACK:
					this.logger.ACK("outbound");
					break;
				case MessageHeaders.CAN:
					this.logger.CAN("outbound");
					break;
				case MessageHeaders.NAK:
					this.logger.NAK("outbound");
					break;
			}
		} else {
			this.logger.data("outbound", data);
		}

		const writer = this.writable.getWriter();
		try {
			await writer.write(data);
		} finally {
			writer.releaseLock();
		}
	}
}

/**
 * Merge multiple streams into a single one, not taking order into account.
 * If a stream ends before other ones, the other will continue adding data,
 * and the finished one will not add any more data.
 */
export function mergeReadableStreams<T>(
	...streams: ReadableStream<T>[]
): ReadableStream<T> {
	const resolvePromises = streams.map(() => createDeferredPromise<void>());
	return new ReadableStream<T>({
		start(controller) {
			void Promise.all(resolvePromises).then(() => {
				controller.close();
			});
			try {
				for (const [key, stream] of Object.entries(streams)) {
					void (async () => {
						try {
							for await (const data of stream) {
								controller.enqueue(data);
							}
						} catch (e) {
							// AbortErrors are expected when the stream is closed
							if (!isAbortError(e)) throw e;
						}
						resolvePromises[+key].resolve();
					})();
				}
			} catch (e) {
				controller.error(e);
			}
		},
	});
}
