// wotan-disable no-restricted-property-access
// wotan-disable prefer-dot-notation

import { Mixin } from "@zwave-js/shared";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { ZWaveSerialPort } from "./ZWaveSerialPort";

const instances = new Map<string, MockSerialPort>();

@Mixin([EventEmitter])
class MockBinding extends PassThrough {}

ZWaveSerialPort.Binding = MockBinding as any;

export class MockSerialPort extends ZWaveSerialPort {
	constructor(port: string) {
		super(port);
		instances.set(port, this);
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

	public async receiveData(data: Buffer): Promise<void> {
		return new Promise((resolve, reject) => {
			this["serial"].write(data, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
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
