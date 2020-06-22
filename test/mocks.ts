import type { CommandClasses } from "@zwave-js/core";
import type { Driver, ZWaveNode } from "zwave-js/src";
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
