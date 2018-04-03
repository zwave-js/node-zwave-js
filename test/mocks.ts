// tslint:disable:no-console
// tslint:disable:no-unused-expression
// tslint:disable:variable-name
import { assert, expect, should, use } from "chai";
import { SinonStub, spy, stub } from "sinon";

import { EventEmitter } from "events";
import * as SerialPort from "serialport";
import { FunctionType, MessagePriority, MessageType } from "../src/lib/message/Constants";
import { expectedResponse, Message, messageTypes, priority } from "../src/lib/message/Message";

const instances = new Map<string, MockSerialPort>();

// tslint:disable:unified-signatures
export interface MockSerialPort {
	// default events
	on(event: "open", callback: () => void): this;
	on(event: "close", callback: () => void): this;
	on(event: "error", callback: SerialPort.ErrorCallback): this;
	on(event: "data", callback: (data: Buffer) => void): this;
}

export class MockSerialPort extends EventEmitter {

	constructor(
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

	public static getInstance(port: string): MockSerialPort {
		return instances.get(port);
	}

	public open() {
		this.openStub();
	}
	public readonly openStub: SinonStub = stub();
	public doOpen() {
		this.emit("open");
	}
	public failOpen(err: Error) {
		this.emit("error", err);
	}

	public close() {
		this.closeStub();
		this.emit("close");
	}
	public readonly closeStub: SinonStub = stub();

	public receiveData(data: Buffer) {
		this.emit("data", data);
	}

	public raiseError(err: Error) {
		this.emit("error", err);
	}

	public write(data: string | number[] | Buffer) {
		this.writeStub(data);
	}
	public readonly writeStub: SinonStub = stub();

}

export const MockRequestMessageWithExpectation_FunctionType = 0xfa as FunctionType;
export const MockRequestMessageWithoutExpectation_FunctionType = 0xfb as FunctionType;
export const MockResponseMessage_FunctionType = 0xff as FunctionType;

@messageTypes(MessageType.Request, MockRequestMessageWithExpectation_FunctionType)
@expectedResponse(MockResponseMessage_FunctionType)
@priority(MessagePriority.Normal)
// @ts-ignore decorators are working
export class MockRequestMessageWithExpectation extends Message {

}

@messageTypes(MessageType.Request, MockRequestMessageWithoutExpectation_FunctionType)
@priority(MessagePriority.Normal)
// @ts-ignore decorators are working
export class MockRequestMessageWithoutExpectation extends Message {

}

@messageTypes(MessageType.Response, MockResponseMessage_FunctionType)
// @ts-ignore decorators are working
export class MockResponseMessage extends Message {
	constructor() {
		super();
	}
}
