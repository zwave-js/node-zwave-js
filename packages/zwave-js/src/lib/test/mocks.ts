import { getImplementedVersion } from "@zwave-js/cc";
import { ConfigManager } from "@zwave-js/config";
import {
	type CommandClassInfo,
	type CommandClasses,
	type FLiRS,
	type GetNode,
	type GetValueDB,
	type InterviewStage,
	type MaybeNotKnown,
	MessagePriority,
	NOT_KNOWN,
	type NodeStatus,
	SecurityClass,
	ZWaveError,
	ZWaveErrorCodes,
	securityClassOrder,
} from "@zwave-js/core";
import type { BaseTestEndpoint, BaseTestNode } from "@zwave-js/host";
import {
	type FunctionType,
	Message,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { SendDataRequest } from "@zwave-js/serial/serialapi";
import sinon from "sinon";
import type { ZWaveNode } from "../node/Node.js";
import * as nodeUtils from "../node/utils.js";

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
		sendMessage: sinon.stub().callsFake(() => Promise.resolve()),
		sendCommand: sinon.stub(),
		getSupportedCCVersion: sinon.stub(),
		getSafeCCVersion: sinon.stub(),
		isCCSecure: sinon.stub().callsFake(() => false),
		getNextCallbackId: sinon
			.stub()
			.callsFake(() => mockDriverDummyCallbackId),
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
		getValueDB: (nodeId: number) => {
			return ret.controller.nodes.get(nodeId).valueDB;
		},
		metadataDB: new Map(),
		networkCache: new Map(),
		cacheGet: sinon.stub().callsFake(
			<T>(
				cacheKey: string,
				options?: {
					reviver?: (value: any) => T;
				},
			): T | undefined => {
				let _ret = ret.networkCache.get(cacheKey);
				if (
					_ret !== undefined
					&& typeof options?.reviver === "function"
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
		cacheSet: sinon.stub().callsFake(
			<T>(
				cacheKey: string,
				value: T | undefined,
				options?: {
					serializer?: (value: T) => any;
				},
			): void => {
				if (
					value !== undefined
					&& typeof options?.serializer === "function"
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
		getLogConfig: () => {
			return {
				enabled: false,
				level: "info",
			};
		},
	};
	ret.sendCommand.callsFake(async (command, options) => {
		const msg = new SendDataRequest({ command });
		const resp = await ret.sendMessage(msg, options);
		return resp?.command;
	});
	ret.getSupportedCCVersion.callsFake(
		(ccId: CommandClasses, nodeId: number, endpointIndex: number = 0) => {
			if (
				ret.controller?.nodes instanceof Map
				&& ret.controller.nodes.has(nodeId)
			) {
				const node: ZWaveNode = ret.controller.nodes.get(nodeId);
				const ccVersion = node
					.getEndpoint(endpointIndex)!
					.getCCVersion(ccId);
				return ccVersion;
			}
			return 0;
		},
	);
	ret.getSafeCCVersion.callsFake(
		(ccId: CommandClasses, nodeId: number, endpointIndex: number = 0) => {
			return (
				ret.getSupportedCCVersion(ccId, nodeId, endpointIndex)
				|| getImplementedVersion(ccId)
			);
		},
	);
	return ret;
}

export interface CreateTestNodeOptions {
	id: number;
	isListening?: boolean | undefined;
	isFrequentListening?: FLiRS | undefined;
	status?: NodeStatus;
	interviewStage?: InterviewStage;
	isSecure?: MaybeNotKnown<boolean>;

	commandClasses?: Partial<
		Record<
			CommandClasses,
			Partial<CommandClassInfo>
		>
	>;
	endpoints?: Record<
		number,
		Omit<CreateTestEndpointOptions, "index" | "nodeId">
	>;
}

export type TestNode = BaseTestNode & {
	setEndpoint(endpoint: CreateTestEndpointOptions): void;
};

export function createTestNode(
	host: GetValueDB & GetNode<BaseTestNode>,
	options: CreateTestNodeOptions,
): TestNode {
	const endpointCache = new Map<number, BaseTestEndpoint>();
	const securityClasses = new Map<SecurityClass, boolean>();

	const ret: TestNode = {
		id: options.id,
		...createTestEndpoint(host, {
			nodeId: options.id,
			index: 0,
			commandClasses: options.commandClasses,
		}),

		isListening: options.isListening ?? true,
		isFrequentListening: options.isFrequentListening ?? false,
		get canSleep() {
			if (ret.isListening == undefined) return undefined;
			if (ret.isFrequentListening == undefined) return undefined;
			return !ret.isListening && !ret.isFrequentListening;
		},

		setEndpoint: (endpoint) => {
			endpointCache.set(
				endpoint.index,
				createTestEndpoint(host, {
					nodeId: options.id,
					index: endpoint.index,
					commandClasses: endpoint.commandClasses,
				}),
			);
		},

		getEndpoint: ((index: number) => {
			if (index === 0) return ret;

			if (!endpointCache.has(index)) {
				if (!options.endpoints?.[index]) {
					return undefined;
				}

				ret.setEndpoint({
					nodeId: options.id,
					index,
					commandClasses: options.endpoints[index].commandClasses,
				});
			}
			return endpointCache.get(index);
		}) as BaseTestNode["getEndpoint"],

		getEndpointOrThrow(index) {
			const ep = ret.getEndpoint(index);
			if (!ep) {
				throw new ZWaveError(
					`Endpoint ${index} does not exist on Node ${ret.id}`,
					ZWaveErrorCodes.Controller_EndpointNotFound,
				);
			}
			return ep;
		},

		// These are copied from Node.ts
		getHighestSecurityClass(): SecurityClass | undefined {
			if (securityClasses.size === 0) return undefined;
			let missingSome = false;
			for (const secClass of securityClassOrder) {
				if (securityClasses.get(secClass) === true) return secClass;
				if (!securityClasses.has(secClass)) {
					missingSome = true;
				}
			}
			// If we don't have the info for every security class, we don't know the highest one yet
			return missingSome ? undefined : SecurityClass.None;
		},
		hasSecurityClass(securityClass: SecurityClass): MaybeNotKnown<boolean> {
			return securityClasses.get(securityClass);
		},
		setSecurityClass(securityClass: SecurityClass, granted: boolean): void {
			securityClasses.set(securityClass, granted);
		},
		get isSecure(): MaybeNotKnown<boolean> {
			const securityClass = ret.getHighestSecurityClass();
			if (securityClass == undefined) return NOT_KNOWN;
			if (securityClass === SecurityClass.None) return false;
			return true;
		},
	};

	endpointCache.set(0, ret);

	// If the number of endpoints are given, use them as the individual endpoint count
	if (options.endpoints) {
		nodeUtils.setIndividualEndpointCount(
			host,
			ret.id,
			Object.keys(options.endpoints).length,
		);
		nodeUtils.setEndpointIndizes(
			host,
			ret.id,
			Object.keys(options.endpoints).map((index) => parseInt(index, 10)),
		);
		nodeUtils.setAggregatedEndpointCount(host, ret.id, 0);
		nodeUtils.setMultiChannelInterviewComplete(host, ret.id, true);
	}

	return ret;
}

export interface CreateTestEndpointOptions {
	nodeId: number;
	index: number;
	commandClasses?: Partial<
		Record<
			CommandClasses,
			Partial<CommandClassInfo>
		>
	>;
}

export function createTestEndpoint(
	host: GetNode<BaseTestNode>,
	options: CreateTestEndpointOptions,
): BaseTestEndpoint {
	const ret: BaseTestEndpoint = {
		virtual: false,
		nodeId: options.nodeId,
		index: options.index,
		supportsCC: (cc) => {
			const ccInfo = options.commandClasses?.[cc];
			if (!ccInfo) return false;
			return ccInfo.isSupported ?? true;
		},
		controlsCC: (cc) => {
			const ccInfo = options.commandClasses?.[cc];
			if (!ccInfo) return false;
			return ccInfo.isControlled ?? false;
		},
		isCCSecure: (cc) => {
			const ccInfo = options.commandClasses?.[cc];
			if (!ccInfo) return false;
			return ccInfo.secure ?? false;
		},
		getCCVersion: (cc) => {
			const ccInfo = options.commandClasses?.[cc];
			const defaultVersion = ccInfo?.isSupported
				? getImplementedVersion(cc)
				: 0;
			return ccInfo?.version
				?? host.getNode(options.nodeId)?.getCCVersion(cc)
				?? defaultVersion;
		},
	};

	return ret;
}
