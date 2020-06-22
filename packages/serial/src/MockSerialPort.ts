import { EventEmitter } from "events";
import type SerialPort from "serialport";

const instances = new Map<string, MockSerialPort>();

export interface MockSerialPort {
	// default events
	on(event: "open", callback: () => void): this;
	on(event: "close", callback: () => void): this;
	on(event: "error", callback: SerialPort.ErrorCallback): this;
	on(event: "data", callback: (data: Buffer) => void): this;
}

export class MockSerialPort extends EventEmitter {
	public constructor(
		private readonly port: string,
		private readonly options?: SerialPort.OpenOptions,
		errorCallback?: SerialPort.ErrorCallback,
	) {
		super();
		instances.set(port, this);

		if (errorCallback != null) this.on("error", errorCallback);
		if (options == null || options.autoOpen === true) {
			this.open();
		}
	}

	public static getInstance(port: string): MockSerialPort | undefined {
		return instances.get(port);
	}

	public open(): void {
		this.openStub();
	}
	public readonly openStub: jest.Mock = jest.fn();
	public doOpen(): void {
		this.emit("open");
	}
	public failOpen(err: Error): void {
		this.emit("error", err);
	}

	public close(): void {
		this.closeStub();
		this.emit("close");
	}
	public readonly closeStub: jest.Mock = jest.fn();

	public receiveData(data: Buffer): void {
		this.emit("data", data);
	}

	public raiseError(err: Error): void {
		this.emit("error", err);
	}

	public write(data: string | number[] | Buffer): void {
		this._lastWrite = data;
		this.writeStub(data);
	}
	public readonly writeStub: jest.Mock = jest.fn();

	private _lastWrite: string | number[] | Buffer | undefined;
	public get lastWrite(): string | number[] | Buffer | undefined {
		return this._lastWrite;
	}
}
