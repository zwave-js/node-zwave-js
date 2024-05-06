import type { ZWaveLogContainer } from "@zwave-js/core";
import { Mixin } from "@zwave-js/shared";
import { EventEmitter } from "node:events";
import { PassThrough, type Readable, type Writable } from "node:stream";
import { SerialLogger } from "./Logger";
import { type ZWaveSerialPortImplementation } from "./ZWaveSerialPortImplementation";
import { ZnifferParser } from "./parsers/ZnifferParser";

export interface ZnifferSerialPortEventCallbacks {
	error: (e: Error) => void;
	data: (data: Buffer) => void;
	discardedData: (data: Buffer) => void;
}

export type ZnifferSerialPortEvents = Extract<
	keyof ZnifferSerialPortEventCallbacks,
	string
>;

export interface ZnifferSerialPortBase {
	on<TEvent extends ZnifferSerialPortEvents>(
		event: TEvent,
		callback: ZnifferSerialPortEventCallbacks[TEvent],
	): this;
	addListener<TEvent extends ZnifferSerialPortEvents>(
		event: TEvent,
		callback: ZnifferSerialPortEventCallbacks[TEvent],
	): this;
	once<TEvent extends ZnifferSerialPortEvents>(
		event: TEvent,
		callback: ZnifferSerialPortEventCallbacks[TEvent],
	): this;
	off<TEvent extends ZnifferSerialPortEvents>(
		event: TEvent,
		callback: ZnifferSerialPortEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends ZnifferSerialPortEvents>(
		event: TEvent,
		callback: ZnifferSerialPortEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: ZnifferSerialPortEvents): this;

	emit<TEvent extends ZnifferSerialPortEvents>(
		event: TEvent,
		...args: Parameters<ZnifferSerialPortEventCallbacks[TEvent]>
	): boolean;
}

const IS_TEST = process.env.NODE_ENV === "test" || !!process.env.CI;

// This is basically a duplex transform stream wrapper around any stream (network, serial, ...)
// 0 ┌─────────────────┐ ┌───────────────────┐ ┌──
// 1 <--               <--    PassThrough    <-- write
// 1 │    any stream   │ │ ZnifferSerialPort │ │
// 0 -->               -->      Parsers      --> read
// 1 └─────────────────┘ └───────────────────┘ └──
// The implementation idea is based on https://stackoverflow.com/a/17476600/10179833

@Mixin([EventEmitter])
export class ZnifferSerialPortBase extends PassThrough {
	protected serial: ReturnType<ZWaveSerialPortImplementation["create"]>;
	protected logger: SerialLogger;

	// Zniffer frame parser
	private parser: ZnifferParser;

	// Allow strongly-typed async iteration
	declare public [Symbol.asyncIterator]: () => AsyncIterableIterator<
		Buffer
	>;

	constructor(
		private implementation: ZWaveSerialPortImplementation,
		loggers: ZWaveLogContainer,
	) {
		super({ readableObjectMode: true });

		// Route the data event handlers to the parser and handle everything else ourselves
		for (
			const method of [
				"on",
				"once",
				"off",
				"addListener",
				"removeListener",
				"removeAllListeners",
			] as const
		) {
			const original = this[method].bind(this);
			this[method] = (event: any, ...args: any[]) => {
				if (event === "data") {
					// @ts-expect-error
					this.parser[method]("data", ...args);
				} else {
					(original as any)(event, ...args);
				}
				return this;
			};
		}

		this.logger = new SerialLogger(loggers);

		this.serial = implementation.create().on("error", (e) => {
			// Pass errors through
			this.emit("error", e);
		});

		// Prepare parser to hook up to the serial port
		this.parser = new ZnifferParser(
			this.logger,
			(discarded) => this.emit("discardedData", discarded),
		);

		// Check the incoming messages and route them to the correct parser
		this.serial.on("data", (data) => {
			// On Windows, writing to the parsers immediately seems to lag the event loop
			// long enough that the state machine sometimes has not transitioned to the next state yet.
			// By using setImmediate, we "break" the work into manageable chunks.
			// We have some tests that don't like this though, so we don't do it in tests
			const write = () => {
				this.parser.write(data);
			};

			if (IS_TEST) {
				write();
			} else {
				setImmediate(write);
			}
		});

		// When something is piped to us, pipe it to the serial port instead
		// Also pass all written data to the serialport unchanged
		this.on("pipe" as any, (source: Readable) => {
			source.unpipe(this as any);
			// Pass all written data to the serialport unchanged
			source.pipe(this.serial as unknown as Writable, { end: false });
		});

		// When the wrapper is piped to a stream, pipe the serial API stream instead
		this.pipe = this.parser.pipe.bind(this.parser);
		this.unpipe = (destination) => {
			this.parser.unpipe(destination);
			return this;
		};
		// Delegate iterating to the serial API parser
		this[Symbol.asyncIterator] = () => this.parser[Symbol.asyncIterator]();
	}

	public async open(): Promise<void> {
		await this.implementation.open(this.serial);
		this._isOpen = true;
	}

	public close(): Promise<void> {
		this._isOpen = false;
		return this.implementation.close(this.serial);
	}

	private _isOpen: boolean = false;
	public get isOpen(): boolean {
		return this._isOpen;
	}

	public async writeAsync(data: Buffer): Promise<void> {
		if (!this.isOpen) {
			throw new Error("The serial port is not open!");
		}

		this.logger.data("outbound", data);

		return new Promise((resolve, reject) => {
			this.serial.write(data, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}
