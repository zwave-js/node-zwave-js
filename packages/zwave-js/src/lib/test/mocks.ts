/* eslint-disable @typescript-eslint/no-unused-vars */
import { getImplementedVersion } from "@zwave-js/cc";
import { ConfigManager } from "@zwave-js/config";
import {
	InterviewStage,
	MessagePriority,
	NOT_KNOWN,
	NodeStatus,
	SecurityClass,
	ZWaveError,
	ZWaveErrorCodes,
	securityClassOrder,
	type CommandClassInfo,
	type CommandClasses,
	type FLiRS,
	type IZWaveEndpoint,
	type IZWaveNode,
} from "@zwave-js/core";
import type { TestingHost } from "@zwave-js/host";
import {
	Message,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
	type FunctionType,
} from "@zwave-js/serial";
import sinon from "sinon";
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
		cacheSet: sinon.stub().callsFake(
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
		getLogConfig: () => {
			return {
				enabled: false,
				level: "info",
			};
		},
	};
	ret.sendCommand.callsFake(async (command, options) => {
		const msg = new SendDataRequest(ret as unknown as Driver, {
			command,
		});
		const resp = await ret.sendMessage(msg, options);
		return resp?.command;
	});
	ret.getSupportedCCVersion.callsFake(
		(ccId: CommandClasses, nodeId: number, endpointIndex: number = 0) => {
			if (
				ret.controller?.nodes instanceof Map &&
				ret.controller.nodes.has(nodeId)
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
				ret.getSupportedCCVersion(ccId, nodeId, endpointIndex) ||
				getImplementedVersion(ccId)
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

	numEndpoints?: number;

	supportsCC?: (cc: CommandClasses) => boolean;
	controlsCC?: (cc: CommandClasses) => boolean;
	isCCSecure?: (cc: CommandClasses) => boolean;
	getCCVersion?: (cc: CommandClasses) => number;
}

export interface TestNode extends IZWaveNode {
	setEndpoint(endpoint: CreateTestEndpointOptions): void;
}

export function createTestNode(
	host: TestingHost,
	options: CreateTestNodeOptions,
): TestNode {
	const endpointCache = new Map<number, IZWaveEndpoint>();
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
			// When the endpoint count is known, return undefined for non-existent endpoints
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
		}) as IZWaveNode["getEndpoint"],

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

		getAllEndpoints() {
			if (!options.numEndpoints) return [...endpointCache.values()];
			const eps: IZWaveEndpoint[] = [];
			for (let i = 0; i <= options.numEndpoints; i++) {
				const ep = ret.getEndpoint(i);
				if (ep) eps.push(ep);
			}
			return eps;
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
	host: TestingHost,
	options: CreateTestEndpointOptions,
): IZWaveEndpoint {
	const ret: IZWaveEndpoint = {
		nodeId: options.nodeId,
		index: options.index,
		supportsCC: options.supportsCC ?? (() => true),
		controlsCC: options.controlsCC ?? (() => false),
		isCCSecure: options.isCCSecure ?? (() => false),
		getCCVersion:
			options.getCCVersion ??
			((cc) => host.getSafeCCVersion(cc, options.nodeId, options.index)),
		virtual: false,
		addCC: function (
			cc: CommandClasses,
			info: Partial<CommandClassInfo>,
		): void {
			throw new Error("Function not implemented.");
		},
		removeCC: function (cc: CommandClasses): void {
			throw new Error("Function not implemented.");
		},
		getCCs: function (): Iterable<
			[ccId: CommandClasses, info: CommandClassInfo]
		> {
			throw new Error("Function not implemented.");
		},
		getNodeUnsafe: function (): IZWaveNode | undefined {
			throw new Error("Function not implemented.");
		},
	};

	return ret;
}
