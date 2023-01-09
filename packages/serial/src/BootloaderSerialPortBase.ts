import { Mixin } from "@zwave-js/shared";
import { EventEmitter } from "events";
import { ReadlineParser, ReadyParser } from "serialport";
import { Duplex, PassThrough, Readable, Writable } from "stream";
import {
	BootloaderError,
	BootloaderParser,
	BootloaderStatus,
} from "./BootloaderParsers";
import { MessageHeaders } from "./MessageHeaders";

export interface BootloaderSerialPortEventCallbacks {
	error: (e: Error) => void;
	data: (data: BootloaderStatus | BootloaderError) => void;
}

export type BootloaderSerialPortEvents = Extract<
	keyof BootloaderSerialPortEventCallbacks,
	string
>;

export interface BootloaderSerialPortBase {
	on<TEvent extends BootloaderSerialPortEvents>(
		event: TEvent,
		callback: BootloaderSerialPortEventCallbacks[TEvent],
	): this;
	addListener<TEvent extends BootloaderSerialPortEvents>(
		event: TEvent,
		callback: BootloaderSerialPortEventCallbacks[TEvent],
	): this;
	once<TEvent extends BootloaderSerialPortEvents>(
		event: TEvent,
		callback: BootloaderSerialPortEventCallbacks[TEvent],
	): this;
	off<TEvent extends BootloaderSerialPortEvents>(
		event: TEvent,
		callback: BootloaderSerialPortEventCallbacks[TEvent],
	): this;
	removeListener<TEvent extends BootloaderSerialPortEvents>(
		event: TEvent,
		callback: BootloaderSerialPortEventCallbacks[TEvent],
	): this;
	removeAllListeners(event?: BootloaderSerialPortEvents): this;

	emit<TEvent extends BootloaderSerialPortEvents>(
		event: TEvent,
		...args: Parameters<BootloaderSerialPortEventCallbacks[TEvent]>
	): boolean;
}

export interface BootloaderSerialPortImplementation {
	create(): Duplex & EventEmitter;
	open(
		port: ReturnType<BootloaderSerialPortImplementation["create"]>,
	): Promise<void>;
	close(
		port: ReturnType<BootloaderSerialPortImplementation["create"]>,
	): Promise<void>;
}

// This is basically a duplex transform stream wrapper around any stream (network, serial, ...)
// 0 ┌─────────────────┐ ┌─────────────────┐ ┌──
// 1 <--               <--   PassThrough   <-- write
// 1 │    any stream   │ │  GBLSerialPort  │ │
// 0 -->               -->  ...parsers...  --> read
// 1 └─────────────────┘ └─────────────────┘ └──
// The implementation idea is based on https://stackoverflow.com/a/17476600/10179833

@Mixin([EventEmitter])
export class BootloaderSerialPortBase extends PassThrough {
	protected serial: ReturnType<BootloaderSerialPortImplementation["create"]>;

	private ackParser: ReadyParser;
	private screenParser: ReadlineParser;
	private bootloaderParser: BootloaderParser;

	constructor(private implementation: BootloaderSerialPortImplementation) {
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
					this.bootloaderParser[method]("data", ...args);
				} else {
					(original as any)(event, ...args);
				}
				return this;
			};
		}

		this.serial = implementation.create().on("error", (e) => {
			// Pass errors through
			this.emit("error", e);
		});

		// Hook up parsers to the serial port.
		// This one looks for the ACK byte which is received after entering the bootloader
		this.ackParser = new ReadyParser({
			delimiter: Buffer.from([MessageHeaders.ACK]),
		});
		// This one looks for NUL chars which terminate each bootloader output screen
		this.screenParser = new ReadlineParser({
			delimiter: "\0",
			includeDelimiter: false,
		});
		// This one parses the bootloader output into a more usable format
		this.bootloaderParser = new BootloaderParser();

		// Parse the serial port input through the parsers
		this.screenParser.pipe(this.bootloaderParser);
		this.ackParser.pipe(this.screenParser);
		this.serial.pipe(this.ackParser);

		// When the wrapper is piped to a stream, pipe the parser instead
		this.pipe = this.bootloaderParser.pipe.bind(this.bootloaderParser);
		this.unpipe = (destination) => {
			this.bootloaderParser.unpipe(destination);
			return this;
		};

		// When something is piped to us, pipe it to the serial port instead
		// Also pass all written data to the serialport unchanged
		this.on("pipe" as any, (source: Readable) => {
			source.unpipe(this as any);
			// Pass all written data to the serialport unchanged
			source.pipe(this.serial as unknown as Writable, { end: false });
		});

		// Delegate iterating to the parser stream
		this[Symbol.asyncIterator] = () =>
			this.bootloaderParser[Symbol.asyncIterator]();
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

		return new Promise((resolve, reject) => {
			this.serial.write(data, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}
