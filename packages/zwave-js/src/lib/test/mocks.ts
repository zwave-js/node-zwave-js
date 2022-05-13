import { ConfigManager } from "@zwave-js/config";
import type { CommandClasses } from "@zwave-js/core";
import { getImplementedVersion } from "../commandclass/CommandClass";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	messageTypes,
	priority,
} from "../message/Message";
import type { ZWaveNode } from "../node/Node";
import { SendDataRequest } from "../serialapi/transport/SendDataMessages";

const MockRequestMessageWithExpectation_FunctionType =
	0xfa as unknown as FunctionType;
const MockRequestMessageWithoutExpectation_FunctionType =
	0xfb as unknown as FunctionType;
const MockResponseMessage_FunctionType = 0xff as unknown as FunctionType;

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
		getSafeCCVersionForNode: jest
			.fn()
			.mockImplementation(
				(
					ccId: CommandClasses,
					nodeId: number,
					endpointIndex: number = 0,
				) => {
					if (
						ret.controller?.nodes instanceof Map &&
						ret.controller.nodes.has(nodeId)
					) {
						const node: ZWaveNode =
							ret.controller.nodes.get(nodeId);
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
		get nodes() {
			return ret.controller.nodes;
		},
		get ownNodeId() {
			return ret.controller.ownNodeId;
		},
		valueDB: new Map(),
		metadataDB: new Map(),
		networkCache: new Map(),
		cacheGet: jest.fn().mockImplementation(
			<T>(
				cacheKey: string,
				options?: {
					reviver?: (value: any) => T;
				},
			): T | undefined => {
				let _ret = ret.networkCache.get(cacheKey);
				if (
					_ret !== undefined &&
					typeof options?.reviver === "function"
				) {
					try {
						_ret = options.reviver(_ret);
					} catch {
						// ignore, invalid entry
					}
				}
				return _ret;
			},
		),
		cacheSet: jest.fn().mockImplementation(
			<T>(
				cacheKey: string,
				value: T | undefined,
				options?: {
					serializer?: (value: T) => any;
				},
			): void => {
				if (
					value !== undefined &&
					typeof options?.serializer === "function"
				) {
					value = options.serializer(value);
				}

				if (value === undefined) {
					ret.networkCache.delete(cacheKey);
				} else {
					ret.networkCache.set(cacheKey, value);
				}
			},
		),
		options: {
			timeouts: {
				ack: 1000,
				byte: 150,
				response: 1600,
				report: 1600,
				nonce: 5000,
				sendDataCallback: 65000,
			},
			attempts: {
				sendData: 3,
				controller: 3,
			},
		},
		driverLog: new Proxy(
			{},
			{
				get() {
					return () => {
						/* intentionally empty */
					};
				},
			},
		),
		controllerLog: new Proxy(
			{},
			{
				get() {
					return () => {
						/* intentionally empty */
					};
				},
			},
		),
		configManager: new ConfigManager(),
	};
	ret.sendCommand.mockImplementation(async (command, options) => {
		const msg = new SendDataRequest(ret as unknown as Driver, {
			command,
		});
		const resp = await ret.sendMessage(msg, options);
		return resp?.command;
	});
	return ret;
}
