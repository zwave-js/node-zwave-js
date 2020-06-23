import { Mixin } from "@zwave-js/shared";
import { EventEmitter } from "events";
import type SerialPort from "serialport";
import { PassThrough, Readable, Writable } from "stream";
import log from "./Logger";
import { MessageHeaders } from "./MessageHeaders";
import { SerialAPIParser } from "./SerialAPIParser";

export type ZWaveSerialChunk =
	| MessageHeaders.ACK
	| MessageHeaders.NAK
	| MessageHeaders.CAN
	| Buffer;

interface ZWaveSerialPortEventCallbacks {
	error: (e: Error) => void;
	data: (data: ZWaveSerialChunk) => void;
}

type ZWaveSerialPortEvents = Extract<
	keyof ZWaveSerialPortEventCallbacks,
	string
>;

export interface ZWaveSerialPort {
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

// This serial port wrapper is basically a duplex transform stream
// 0 ┌─────────────────┐ ┌─────────────────┐ ┌──
// 1 <--               <--   PassThrough   <-- write
// 1 │ node-serialport │ │ ZWaveSerialPort │ │
// 0 -->               --> SerialAPIParser --> read
// 1 └─────────────────┘ └─────────────────┘ └──
// The implementation idea is based on https://stackoverflow.com/a/17476600/10179833

@Mixin([EventEmitter])
export class ZWaveSerialPort extends PassThrough {
	private serial: SerialPort;
	private parser: SerialAPIParser;

	// Allow strongly-typed async iteration
	public declare [Symbol.asyncIterator]: () => AsyncIterableIterator<
		ZWaveSerialChunk
	>;

	constructor(port: string);
	/** @internal */ constructor(port: string, Binding: typeof SerialPort);
	constructor(
		port: string,
		Binding: typeof SerialPort = require("serialport"),
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
				} else {
					(original as any)(event, ...args);
				}
				return this;
			};
		}

		this.serial = new Binding(port, {
			autoOpen: false,
			baudRate: 115200,
			dataBits: 8,
			stopBits: 1,
			parity: "none",
		}).on("error", (e) => {
			// Pass errors through
			this.emit("error", e);
		});

		// Hook up a parser to the serial port
		this.parser = new SerialAPIParser();
		this.serial.pipe(this.parser);
		// When the wrapper is piped to a stream, pipe the parser instead
		this.pipe = this.parser.pipe.bind(this.parser);
		this.unpipe = (destination) => {
			this.parser.unpipe(destination);
			return this;
		};

		// When something is piped to us, pipe it to the serial port instead
		// Also pass all written data to the serialport unchanged
		// wotan-disable-next-line
		this.on("pipe" as any, (source: Readable) => {
			source.unpipe(this as any);
			// Pass all written data to the serialport unchanged
			source.pipe((this.serial as unknown) as Writable, { end: false });
		});

		// Delegate iterating to the parser stream
		this[Symbol.asyncIterator] = () => this.parser[Symbol.asyncIterator]();
	}

	public open(): Promise<void> {
		return new Promise((resolve) => {
			this.serial.once("open", resolve).open();
		});
	}

	public close(): Promise<void> {
		return new Promise((resolve) => {
			this.serial.once("close", resolve).close();
		});
	}

	public get isOpen(): boolean {
		return this.serial.isOpen;
	}

	public async writeAsync(data: Buffer): Promise<void> {
		if (!this.isOpen) {
			throw new Error("The serial port is not open!");
		}
		if (data.length === 1) {
			switch (data[0]) {
				case MessageHeaders.ACK:
					log.serial.ACK("outbound");
					break;
				case MessageHeaders.CAN:
					log.serial.CAN("outbound");
					break;
				case MessageHeaders.NAK:
					log.serial.NAK("outbound");
					break;
			}
		} else {
			log.serial.data("outbound", data);
		}

		return new Promise((resolve, reject) => {
			this.serial.write(data, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}
