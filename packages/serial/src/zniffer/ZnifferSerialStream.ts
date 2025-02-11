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
import { ZnifferParser } from "../parsers/ZnifferParser.js";
import { type ZnifferSerialFrame } from "../parsers/ZnifferSerialFrame.js";
import { type ZWaveSerialBindingFactory } from "../serialport/ZWaveSerialStream.js";

/** Re-usable stream factory to create new serial streams */
export class ZnifferSerialStreamFactory {
	constructor(
		binding: ZWaveSerialBindingFactory,
		loggers: LogContainer,
	) {
		this.binding = binding;
		this.logger = new SerialLogger(loggers);
	}

	private binding: ZWaveSerialBindingFactory;
	protected logger: SerialLogger;

	public async createStream(): Promise<ZnifferSerialStream> {
		// Set up streams for the underlying resource
		const { source, sink } = await this.binding();
		return new ZnifferSerialStream(source, sink, this.logger);
	}
}

/** Single-use serial stream. Has to be re-created after being closed. */
export class ZnifferSerialStream implements
	ReadableWritablePair<
		// The serial binding emits ZniferSerialFrames
		ZnifferSerialFrame,
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
		const { readable: input, writable } = new TransformStream<
			Uint8Array,
			Uint8Array
		>();
		this.writable = writable;
		const sinkStream = new WritableStream(sink);
		void input
			.pipeTo(sinkStream, { signal: this.#abort.signal })
			.catch(noop);

		// Pipe the underlying source through the parser to the readable side
		const { readable, writable: output } = new TransformStream<
			ZnifferSerialFrame,
			ZnifferSerialFrame
		>();
		this.readable = readable;
		const parser = new ZnifferParser(logger);
		const sourceStream = new ReadableStream(source);

		void sourceStream
			.pipeThrough(parser, { signal: this.#abort.signal })
			.pipeTo(output, { signal: this.#abort.signal })
			.catch((_e) => {
				this._isOpen = false;
			});
	}

	protected logger: SerialLogger;

	// Public interface to let consumers read from and write to this stream
	public readonly readable: ReadableStream<ZnifferSerialFrame>;
	public readonly writable: WritableStream<Uint8Array>;

	// Signal to close the underlying stream
	#abort: AbortController;

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

		this.logger.data("outbound", data);

		const writer = this.writable.getWriter();
		try {
			await writer.write(data);
		} finally {
			writer.releaseLock();
		}
	}
}
