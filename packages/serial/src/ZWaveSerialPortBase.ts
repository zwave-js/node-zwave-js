import type { ZWaveLogContainer } from "@zwave-js/core";
import { Mixin } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import { EventEmitter } from "events";
import { PassThrough, type Duplex, type Readable, type Writable } from "stream";
import { SerialLogger } from "./Logger";
import { MessageHeaders } from "./MessageHeaders";
import {
	BootloaderParser,
	BootloaderScreenParser,
	bootloaderMenuPreamble,
	type BootloaderChunk,
} from "./parsers/BootloaderParsers";
import { SerialAPIParser } from "./parsers/SerialAPIParser";

export type ZWaveSerialChunk =
	| MessageHeaders.ACK
	| MessageHeaders.NAK
	| MessageHeaders.CAN
	| Buffer;

export enum ZWaveSerialMode {
	SerialAPI,
	Bootloader,
}

export interface ZWaveSerialPortEventCallbacks {
	error: (e: Error) => void;
	data: (data: ZWaveSerialChunk) => void;
	discardedData: (data: Buffer) => void;
	bootloaderData: (data: BootloaderChunk) => void;
}

export type ZWaveSerialPortEvents = Extract<
	keyof ZWaveSerialPortEventCallbacks,
	string
>;

export interface ZWaveSerialPortBase {
	on<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this;
	addListener<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this;
	once<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this;
	off<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: ZWaveSerialPortEvents): this;

	emit<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		...args: Parameters<ZWaveSerialPortEventCallbacks[TEvent]>
	): boolean;
}

export function isZWaveSerialPortImplementation(
	obj: unknown,
): obj is ZWaveSerialPortImplementation {
	return (
		isObject(obj) &&
		typeof obj.create === "function" &&
		typeof obj.open === "function" &&
		typeof obj.close === "function"
	);
}

export interface ZWaveSerialPortImplementation {
	create(): Duplex & EventEmitter;
	open(
		port: ReturnType<ZWaveSerialPortImplementation["create"]>,
	): Promise<void>;
	close(
		port: ReturnType<ZWaveSerialPortImplementation["create"]>,
	): Promise<void>;
}

const IS_TEST = process.env.NODE_ENV === "test" || !!process.env.CI;

// This is basically a duplex transform stream wrapper around any stream (network, serial, ...)
// 0 ┌─────────────────┐ ┌─────────────────┐ ┌──
// 1 <--               <--   PassThrough   <-- write
// 1 │    any stream   │ │ ZWaveSerialPort │ │
// 0 -->               -->     Parsers     --> read
// 1 └─────────────────┘ └─────────────────┘ └──
// The implementation idea is based on https://stackoverflow.com/a/17476600/10179833

@Mixin([EventEmitter])
export class ZWaveSerialPortBase extends PassThrough {
	protected serial: ReturnType<ZWaveSerialPortImplementation["create"]>;
	protected logger: SerialLogger;

	// Serial API parser
	private parser: SerialAPIParser;
	// Bootloader parsers
	private bootloaderScreenParser: BootloaderScreenParser;
	private bootloaderParser: BootloaderParser;

	// Allow switching between modes
	public mode: ZWaveSerialMode | undefined;

	// Allow strongly-typed async iteration
	public declare [Symbol.asyncIterator]: () => AsyncIterableIterator<ZWaveSerialChunk>;

	constructor(
		private implementation: ZWaveSerialPortImplementation,
		loggers: ZWaveLogContainer,
	) {
		super({ readableObjectMode: true });

		// Route the data event handlers to the parser and handle everything else ourselves
		for (const method of [
			"on",
			"once",
			"off",
			"addListener",
			"removeListener",
			"removeAllListeners",
		] as const) {
			const original = this[method].bind(this);
			this[method] = (event: any, ...args: any[]) => {
				if (event === "data") {
					// @ts-expect-error
					this.parser[method]("data", ...args);
				} else if (event === "bootloaderData") {
					// @ts-expect-error
					this.bootloaderParser[method]("data", ...args);
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

		// Prepare parsers to hook up to the serial port
		// -> Serial API mode
		this.parser = new SerialAPIParser(this.logger, (discarded) =>
			this.emit("discardedData", discarded),
		);

		// -> Bootloader mode
		// This one looks for NUL chars which terminate each bootloader output screen
		this.bootloaderScreenParser = new BootloaderScreenParser(this.logger);
		// This one parses the bootloader output into a more usable format
		this.bootloaderParser = new BootloaderParser();
		// this.bootloaderParser.pipe(this.output);
		this.bootloaderScreenParser.pipe(this.bootloaderParser);

		// Check the incoming messages and route them to the correct parser
		this.serial.on("data", (data) => {
			if (this.mode == undefined) {
				// If we haven't figured out the startup mode yet,
				// inspect the chunk to see if it contains the bootloader preamble
				const str = (data as Buffer).toString("ascii").trim();
				this.mode = str.startsWith(bootloaderMenuPreamble)
					? ZWaveSerialMode.Bootloader
					: ZWaveSerialMode.SerialAPI;
			}

			// On Windows, writing to the parsers immediately seems to lag the event loop
			// long enough that the state machine sometimes has not transitioned to the next state yet.
			// By using setImmediate, we "break" the work into manageable chunks.
			// We have some tests that don't like this though, so we don't do it in tests
			const write = () => {
				if (this.mode === ZWaveSerialMode.Bootloader) {
					this.bootloaderScreenParser.write(data);
				} else {
					this.parser.write(data);
				}
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

		return new Promise((resolve, reject) => {
			this.serial.write(data, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}
