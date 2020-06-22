import { EventEmitter } from "events";
import SerialPort from "serialport";
import { PassThrough, Transform, Writable } from "stream";
import { promisify } from "util";
import type { MessageHeaders } from "./MessageHeaders";
import { SerialAPIParser } from "./SerialAPIParser";

interface ZWaveSerialPortEventCallbacks {
	open: () => void;
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
		this.addListener = this.on.bind(this);
		this.removeListener = this.off.bind(this);

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

		this.serial
			.on("open", () => {
				this.emit("open");
			})
			.on("error", (e) => {
				this.emit("error", e);
			});
	}

	public open(): Promise<void> {
		return promisify(this.serial.open.bind(this.serial))();
	}

	public async close(): Promise<void> {
		return promisify(this.serial.close.bind(this.serial))();
	}

	public get isOpen(): boolean {
		return this.serial.isOpen;
	}

	public async writeAsync(data: Buffer): Promise<void> {
		return new Promise((resolve, reject) => {
			this.transmitStream.write(data, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	public on<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this {
		if (event === "data") {
			this.receiveStream.on("data", callback);
		} else {
			super.on(event, callback);
		}
		return this;
	}

	public once<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this {
		if (event === "data") {
			this.receiveStream.once("data", callback);
		} else {
			super.once(event, callback);
		}
		return this;
	}

	public off<TEvent extends ZWaveSerialPortEvents>(
		event: TEvent,
		callback: ZWaveSerialPortEventCallbacks[TEvent],
	): this {
		if (event === "data") {
			this.receiveStream.off("data", callback);
		} else {
			super.off(event, callback);
		}
		return this;
	}

	public removeAllListeners(event?: ZWaveSerialPortEvents): this {
		if (event === "data") {
			this.receiveStream.removeAllListeners("data");
		}
		super.removeAllListeners(event);
		return this;
	}
}
