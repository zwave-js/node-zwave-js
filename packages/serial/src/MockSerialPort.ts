import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { SerialAPIParser } from "./SerialAPIParser";

const instances = new Map<string, MockSerialPort>();

export class MockSerialPort extends EventEmitter {
	private readonly parser: SerialAPIParser;
	private readonly transmitStream: PassThrough;

	constructor(port: string) {
		super();
		instances.set(port, this);

		// Hook up a the parser when reading from the serial port
		this.parser = new SerialAPIParser();
		this.parser.on("data", (data) => this.emit("data", data));
		// And pass everything through that was written
		this.transmitStream = new PassThrough();
		this.transmitStream.on("data", (data) => void this.writeAsync(data));
	}

	public static getInstance(port: string): MockSerialPort | undefined {
		return instances.get(port);
	}

	private _isOpen: boolean = false;
	public get isOpen(): boolean {
		return this._isOpen;
	}

	public open(): Promise<void> {
		return this.openStub().then(() => {
			this._isOpen = true;
		});
	}
	public readonly openStub: jest.Mock = jest.fn(() => Promise.resolve());

	public close(): Promise<void> {
		return this.closeStub().then(() => {
			this._isOpen = false;
		});
	}
	public readonly closeStub: jest.Mock = jest.fn(() => Promise.resolve());

	public receiveData(data: Buffer): void {
		this.parser.write(data);
	}

	public raiseError(err: Error): void {
		this.emit("error", err);
	}

	public writeAsync(data: Buffer): Promise<void> {
		this._lastWrite = data;
		return this.writeStub(data);
	}
	public readonly writeStub: jest.Mock = jest.fn();

	private _lastWrite: string | number[] | Buffer | undefined;
	public get lastWrite(): string | number[] | Buffer | undefined {
		return this._lastWrite;
	}
}
