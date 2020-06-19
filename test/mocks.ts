import { EventEmitter } from "events";
import type SerialPort from "serialport";
import type { CommandClasses, Driver, ZWaveNode } from "zwave-js/src";
import { getImplementedVersion } from "zwave-js/src/lib/commandclass/CommandClass";
import { SendDataRequest } from "zwave-js/src/lib/controller/SendDataMessages";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "zwave-js/src/lib/message/Constants";
import {
	expectedResponse,
	Message,
	messageTypes,
	priority,
} from "zwave-js/src/lib/message/Message";

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
		this.writeStub(data);
	}
	public readonly writeStub: jest.Mock = jest.fn();
}

const MockRequestMessageWithExpectation_FunctionType = (0xfa as unknown) as FunctionType;
const MockRequestMessageWithoutExpectation_FunctionType = (0xfb as unknown) as FunctionType;
const MockResponseMessage_FunctionType = (0xff as unknown) as FunctionType;

@messageTypes(
	MessageType.Request,
	MockRequestMessageWithExpectation_FunctionType,
)
@expectedResponse(MockResponseMessage_FunctionType)
@priority(MessagePriority.Normal)
export class MockRequestMessageWithExpectation extends Message {}

@messageTypes(
	MessageType.Request,
	MockRequestMessageWithoutExpectation_FunctionType,
)
@priority(MessagePriority.Normal)
export class MockRequestMessageWithoutExpectation extends Message {}

@messageTypes(MessageType.Response, MockResponseMessage_FunctionType)
export class MockResponseMessage extends Message {}

export const mockDriverDummyCallbackId = 0xfe;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createEmptyMockDriver() {
	const ret = {
		sendMessage: jest.fn().mockImplementation(() => Promise.resolve()),
		sendCommand: jest.fn(),
		saveNetworkToCache: jest
			.fn()
			.mockImplementation(() => Promise.resolve()),
		getSafeCCVersionForNode: jest
			.fn()
			.mockImplementation(
				(
					ccId: CommandClasses,
					nodeId: number,
					endpointIndex: number = 0,
				) => {
					if (
						// wotan-disable-next-line no-useless-predicate
						ret.controller?.nodes instanceof Map &&
						ret.controller.nodes.has(nodeId)
					) {
						const node: ZWaveNode = ret.controller.nodes.get(
							nodeId,
						);
						const ccVersion = node
							.getEndpoint(endpointIndex)!
							.getCCVersion(ccId);
						if (ccVersion > 0) return ccVersion;
					}
					// default to the implemented version
					return getImplementedVersion(ccId);
				},
			),
		getNextCallbackId: jest
			.fn()
			.mockImplementation(() => mockDriverDummyCallbackId),
		controller: {
			nodes: new Map(),
			ownNodeId: 1,
		},
		valueDB: new Map(),
		metadataDB: new Map(),
	};
	ret.sendCommand.mockImplementation(async (command, options) => {
		const msg = new SendDataRequest((ret as unknown) as Driver, {
			command,
		});
		const resp = await ret.sendMessage(msg, options);
		return resp?.command;
	});
	return ret;
}
