import { ConfigManager, DeviceConfig } from "@zwave-js/config";
import {
	CommandClasses,
	FLiRS,
	InterviewStage,
	Maybe,
	NodeStatus,
	SecurityClass,
	securityClassOrder,
	unknownBoolean,
} from "@zwave-js/core";
import type {
	ZWaveEndpointBase,
	ZWaveHost,
	ZWaveNodeBase,
} from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getImplementedVersion } from "../commandclass/CommandClass";
import type { Driver } from "../driver/Driver";
import type { ZWaveNode } from "../node/Node";
import * as nodeUtils from "../node/utils";
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
		getValueDB: (nodeId: number) => {
			return ret.controller.nodes.get(nodeId).valueDB;
		},
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

export interface CreateTestNodeOptions {
	id: number;
	isListening?: boolean | undefined;
	isFrequentListening?: FLiRS | undefined;
	status?: NodeStatus;
	interviewStage?: InterviewStage;
	deviceConfig?: DeviceConfig;
	isSecure?: Maybe<boolean>;

	numEndpoints?: number;

	supportsCC?: (cc: CommandClasses) => boolean;
	controlsCC?: (cc: CommandClasses) => boolean;
	isCCSecure?: (cc: CommandClasses) => boolean;
	getCCVersion?: (cc: CommandClasses) => number;
}

export interface TestNode extends ZWaveNodeBase {
	setEndpoint(endpoint: CreateTestEndpointOptions): void;
}

export function createTestNode(
	host: ZWaveHost,
	options: CreateTestNodeOptions,
): TestNode {
	const endpointCache = new Map<number, ZWaveEndpointBase>();
	const securityClasses = new Map<SecurityClass, boolean>();

	const ret: TestNode = {
		id: options.id,
		...createTestEndpoint(host, {
			nodeId: options.id,
			index: 0,
			supportsCC: options.supportsCC,
			controlsCC: options.controlsCC,
			isCCSecure: options.isCCSecure,
			getCCVersion: options.getCCVersion,
		}),

		isListening: options.isListening ?? true,
		isFrequentListening: options.isFrequentListening ?? false,
		get canSleep() {
			if (ret.isListening == undefined) return undefined;
			if (ret.isFrequentListening == undefined) return undefined;
			return !ret.isListening && !ret.isFrequentListening;
		},

		status:
			options.status ??
			(options.isListening ? NodeStatus.Alive : NodeStatus.Asleep),
		interviewStage: options.interviewStage ?? InterviewStage.Complete,
		deviceConfig: options.deviceConfig,

		setEndpoint: (endpoint) => {
			endpointCache.set(
				endpoint.index,
				createTestEndpoint(host, {
					nodeId: options.id,
					index: endpoint.index,
					supportsCC: endpoint.supportsCC ?? options.supportsCC,
					controlsCC: endpoint.controlsCC ?? options.controlsCC,
					isCCSecure: endpoint.isCCSecure ?? options.isCCSecure,
					getCCVersion: endpoint.getCCVersion ?? options.getCCVersion,
				}),
			);
		},

		getEndpoint: ((index: number) => {
			// When the endpoint count is known, return undefined for non-existant endpoints
			if (
				options.numEndpoints != undefined &&
				index > options.numEndpoints
			) {
				return undefined;
			}

			if (!endpointCache.has(index)) {
				ret.setEndpoint(
					createTestEndpoint(host, {
						nodeId: options.id,
						index,
						supportsCC: options.supportsCC,
						controlsCC: options.controlsCC,
						isCCSecure: options.isCCSecure,
						getCCVersion: options.getCCVersion,
					}),
				);
			}
			return endpointCache.get(index);
		}) as ZWaveNodeBase["getEndpoint"],

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
		hasSecurityClass(securityClass: SecurityClass): Maybe<boolean> {
			return securityClasses.get(securityClass) ?? unknownBoolean;
		},
		setSecurityClass(securityClass: SecurityClass, granted: boolean): void {
			securityClasses.set(securityClass, granted);
		},
		get isSecure(): Maybe<boolean> {
			const securityClass = ret.getHighestSecurityClass();
			if (securityClass == undefined) return unknownBoolean;
			if (securityClass === SecurityClass.None) return false;
			return true;
		},
	};

	endpointCache.set(0, ret);

	// If the number of endpoints are given, use them as the individual endpoint count
	if (options.numEndpoints != undefined) {
		nodeUtils.setIndividualEndpointCount(host, ret, options.numEndpoints);
		nodeUtils.setAggregatedEndpointCount(host, ret, 0);
		nodeUtils.setMultiChannelInterviewComplete(host, ret, true);
	}

	return ret;
}

export interface CreateTestEndpointOptions {
	nodeId: number;
	index: number;
	supportsCC?: (cc: CommandClasses) => boolean;
	controlsCC?: (cc: CommandClasses) => boolean;
	isCCSecure?: (cc: CommandClasses) => boolean;
	getCCVersion?: (cc: CommandClasses) => number;
}

export function createTestEndpoint(
	host: ZWaveHost,
	options: CreateTestEndpointOptions,
): ZWaveEndpointBase {
	const ret: ZWaveEndpointBase = {
		nodeId: options.nodeId,
		index: options.index,
		supportsCC: options.supportsCC ?? (() => true),
		controlsCC: options.controlsCC ?? (() => false),
		isCCSecure: options.isCCSecure ?? (() => false),
		getCCVersion:
			options.getCCVersion ??
			((cc) =>
				host.getSafeCCVersionForNode(
					cc,
					options.nodeId,
					options.index,
				)),
	};

	return ret;
}
