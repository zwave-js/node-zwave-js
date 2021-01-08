import { ConfigManager } from "@zwave-js/config";
import type { CommandClasses } from "@zwave-js/core";
import { getImplementedVersion } from "../commandclass/CommandClass";
import { SendDataRequest } from "../controller/SendDataMessages";
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
		options: {
			timeouts: {
				ack: 1000,
				byte: 150,
				response: 1600,
				report: 1600,
				nonce: 5000,
				sendDataCallback: 65000,
				nodeAwake: 10000,
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
		const msg = new SendDataRequest((ret as unknown) as Driver, {
			command,
		});
		const resp = await ret.sendMessage(msg, options);
		return resp?.command;
	});
	return ret;
}
