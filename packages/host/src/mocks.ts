import {
	type ControlsCC,
	type EndpointId,
	type GetEndpoint,
	type GetSupportedCCVersion,
	type IsCCSecure,
	type ListenBehavior,
	type NodeId,
	type QuerySecurityClasses,
	type SetSecurityClass,
	type SupportsCC,
	ValueDB,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createThrowingMap } from "@zwave-js/shared";
import type {
	GetAllNodes,
	GetDeviceConfig,
	GetNode,
	GetValueDB,
	HostIDs,
	LogNode,
} from "./ZWaveHost.js";

export interface CreateTestingHostOptions extends HostIDs, GetDeviceConfig {}

export type BaseTestEndpoint =
	& EndpointId
	& SupportsCC
	& ControlsCC
	& IsCCSecure;

export type BaseTestNode =
	& BaseTestEndpoint
	& NodeId
	& ListenBehavior
	& QuerySecurityClasses
	& SetSecurityClass
	& SupportsCC
	& ControlsCC
	& IsCCSecure
	& GetEndpoint<BaseTestEndpoint>;

export interface TestingHost
	extends
		HostIDs,
		GetValueDB,
		GetSupportedCCVersion,
		GetAllNodes<BaseTestNode>,
		GetNode<BaseTestNode>,
		GetDeviceConfig,
		LogNode
{
	setNode(nodeId: number, node: BaseTestNode): void;
}

/** Creates a {@link TestingHost} that can be used instead of a real driver instance in tests */
export function createTestingHost(
	options: Partial<CreateTestingHostOptions> = {},
): TestingHost {
	const valuesStorage = new Map();
	const metadataStorage = new Map();
	const valueDBCache = new Map<number, ValueDB>();
	const nodes = createThrowingMap<number, BaseTestNode>((nodeId) => {
		throw new ZWaveError(
			`Node ${nodeId} was not found!`,
			ZWaveErrorCodes.Controller_NodeNotFound,
		);
	});

	const ret: TestingHost = {
		homeId: options.homeId ?? 0x7e570001,
		ownNodeId: options.ownNodeId ?? 1,
		getDeviceConfig: options.getDeviceConfig ?? (() => undefined),
		// securityManager: undefined,
		// securityManager2: undefined,
		// securityManagerLR: undefined,
		// getDeviceConfig: () => undefined,
		// lookupManufacturer: () => undefined,
		logNode: () => {},
		// options: {
		// 	attempts: {
		// 		nodeInterview: 1,
		// 		// openSerialPort: 1,
		// 		sendData: 3,
		// 		controller: 3,
		// 	},
		// 	timeouts: {
		// 		refreshValue: 5000,
		// 		refreshValueAfterTransition: 1000,
		// 	},
		// },
		// getInterviewOptions() {
		// 	return {};
		// },
		// getUserPreferences() {
		// 	return undefined;
		// },
		// getCommunicationTimeouts() {
		// 	return {
		// 		refreshValue: 5000,
		// 		refreshValueAfterTransition: 1000,
		// 	};
		// },
		getNode(nodeId) {
			return nodes.get(nodeId);
		},
		getNodeOrThrow(nodeId) {
			return nodes.getOrThrow(nodeId);
		},
		getAllNodes() {
			return [...nodes.values()];
		},
		setNode(nodeId, node) {
			nodes.set(nodeId, node);
		},
		// getSafeCCVersion: options.getSafeCCVersion ?? (() => 100),
		getSupportedCCVersion: (cc, nodeId, endpoint) => {
			return nodes.get(nodeId)?.getEndpoint(endpoint ?? 0)?.getCCVersion(
				cc,
			) ?? 0;
			// 	return options.getSupportedCCVersion?.(cc, nodeId, endpoint)
			// 		?? options.getSafeCCVersion?.(cc, nodeId, endpoint)
			// 		?? 100;
		},
		getValueDB: (nodeId) => {
			if (!valueDBCache.has(nodeId)) {
				valueDBCache.set(
					nodeId,
					new ValueDB(
						nodeId,
						valuesStorage as any,
						metadataStorage as any,
					),
				);
			}
			return valueDBCache.get(nodeId)!;
		},
		tryGetValueDB: (nodeId) => {
			return ret.getValueDB(nodeId);
		},
		// getHighestSecurityClass: (nodeId) => {
		// 	const node = nodes.getOrThrow(nodeId);
		// 	return node.getHighestSecurityClass();
		// },
		// hasSecurityClass: (nodeId, securityClass) => {
		// 	const node = nodes.getOrThrow(nodeId);
		// 	return node.hasSecurityClass(securityClass);
		// },
		// setSecurityClass: (nodeId, securityClass, granted) => {
		// 	const node = nodes.getOrThrow(nodeId);
		// 	node.setSecurityClass(securityClass, granted);
		// },
		// sendCommand: async (_command, _options) => {
		// 	return undefined as any;
		// },
		// schedulePoll: (_nodeId, _valueId, _options) => {
		// 	return false;
		// },
	};
	return ret;
}
