import { EventEmitter } from "events";
import SerialPort from "serialport";
import { PassThrough, Transform, Writable } from "stream";
import type { MessageHeaders } from "./MessageHeaders";
import { SerialAPIParser } from "./SerialAPIParser";

interface ZWaveSerialPortEventCallbacks {
	error: (e: Error) => void;
	data: (
		data:
			| MessageHeaders.ACK
			| MessageHeaders.NAK
			| MessageHeaders.CAN
			| Buffer,
	) => void;
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

export class ZWaveSerialPort extends EventEmitter {
	private serial: SerialPort;
	private parser: SerialAPIParser;

	public readonly receiveStream: Transform;
	public readonly transmitStream: Transform;

	constructor(port: string) {
		super();

		// Route the data event to the receive stream
		for (const method of [
			"on",
			"once",
			"off",
			"addListener",
			"removeListener",
			"removeAllListeners",
		] as const) {
			this[method] = (event: any, ...args: any[]) => {
				if (event === "data") {
					// @ts-expect-error
					this.receiveStream[method]("data", ...args);
				} else {
					// wotan-disable no-restricted-property-access
					// @ts-expect-error
					super[method](event, ...args);
					// wotan-enable no-restricted-property-access
				}
				return this;
			};
		}

		this.serial = new SerialPort(port, {
			autoOpen: false,
			baudRate: 115200,
			dataBits: 8,
			stopBits: 1,
			parity: "none",
		});

		// Hook up a the parser when reading from the serial port
		this.receiveStream = this.parser = new SerialAPIParser();
		this.serial.pipe(this.parser);
		// And pass everything through that was written
		this.transmitStream = new PassThrough();
		this.transmitStream.pipe((this.serial as unknown) as Writable);

		this.serial.on("error", (e) => {
			this.emit("error", e);
		});
	}

	public open(): Promise<void> {
		return new Promise((resolve) => {
			this.serial.once("open", resolve).open();
		});
	}

	public async close(): Promise<void> {
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
		return new Promise((resolve, reject) => {
			this.transmitStream.write(data, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}
}
