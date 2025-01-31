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

import { type LogContainer } from "@zwave-js/core";
import { noop } from "@zwave-js/shared";
import type {
	ReadableWritablePair,
	UnderlyingSink,
	UnderlyingSource,
} from "node:stream/web";
import { SerialLogger } from "../log/Logger.js";
import { MessageHeaders } from "../message/MessageHeaders.js";
import { type ZWaveSerialFrame } from "../parsers/ZWaveSerialFrame.js";
import { ZWaveSerialParser } from "../plumbing/ZWaveSerialParser.js";
import { ZWaveSerialMode } from "./definitions.js";

/** The low level bindings used by ZWaveSerialStream.
 * The `sink` is guaranteed to be opened first, so possible setup should be done in
 * the `start` method there. */
export interface ZWaveSerialBinding {
	sink: UnderlyingSink<Uint8Array>;
	source: UnderlyingSource<Uint8Array>;
}

export type ZWaveSerialBindingFactory = () => Promise<ZWaveSerialBinding>;

/** Tests if `obj` is (probably) a ZWaveSerialBindingFactory */
export function isZWaveSerialBindingFactory(
	obj: unknown,
): obj is ZWaveSerialBindingFactory {
	return typeof obj === "function" && obj.length === 0;
}

/** Re-usable stream factory to create new serial streams */
export class ZWaveSerialStreamFactory {
	constructor(
		binding: ZWaveSerialBindingFactory,
		loggers: LogContainer,
	) {
		this.binding = binding;
		this.logger = new SerialLogger(loggers);
	}

	private binding: ZWaveSerialBindingFactory;
	protected logger: SerialLogger;

	public async createStream(): Promise<ZWaveSerialStream> {
		// Set up streams for the underlying resource
		const { source, sink } = await this.binding();
		return new ZWaveSerialStream(source, sink, this.logger);
	}
}

/** Single-use serial stream. Has to be re-created after being closed. */
export class ZWaveSerialStream implements
	ReadableWritablePair<
		// The serial binding emits ZWaveSerialFrames
		ZWaveSerialFrame,
		// and accepts binary data
		Uint8Array
	>
{
	constructor(
		source: UnderlyingSource<Uint8Array>,
		sink: UnderlyingSink<Uint8Array>,
		logger: SerialLogger,
	) {
		this.logger = logger;
		this.#abort = new AbortController();

		// Expose the underlying sink as the writable side of this stream.
		// We use an identity stream in the middle to pipe through, so we
		// can properly abort the stream
		const { readable: input, writable } = new TransformStream();
		this.writable = writable;
		const sinkStream = new WritableStream(sink);
		void input
			.pipeTo(sinkStream, { signal: this.#abort.signal })
			.catch(noop);

		// Pipe the underlying source through the parser to the readable side
		this.parser = new ZWaveSerialParser(logger, this.#abort.signal);
		this.readable = this.parser.readable;
		const sourceStream = new ReadableStream(source);
		void sourceStream.pipeTo(this.parser.writable, {
			signal: this.#abort.signal,
		}).catch((_e) => {
			this._isOpen = false;
		});
	}

	protected logger: SerialLogger;

	// Public interface to let consumers read from and write to this stream
	public readonly readable: ReadableStream<ZWaveSerialFrame>;
	public readonly writable: WritableStream<Uint8Array>;

	// Signal to close the underlying stream
	#abort: AbortController;

	// Serial API parser
	private parser: ZWaveSerialParser;

	// Allow switching between modes
	public get mode(): ZWaveSerialMode | undefined {
		return this.parser.mode;
	}
	public set mode(mode: ZWaveSerialMode | undefined) {
		this.parser.mode = mode;
	}

	// Allow ignoring the high nibble of an ACK once to work around an issue in the 700 series firmware
	public ignoreAckHighNibbleOnce(): void {
		this.parser.ignoreAckHighNibbleOnce();
	}

	public async close(): Promise<void> {
		this._isOpen = false;
		// Close the underlying stream
		this.#abort.abort();

		return Promise.resolve();

		// // Wait for streams to finish
		// await this.#pipePromise;
	}

	private _isOpen: boolean = true;
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
