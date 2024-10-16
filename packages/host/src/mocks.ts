/* eslint-disable @typescript-eslint/require-await */
import {
	type EndpointId,
	type GetEndpoint,
	type IsCCSecure,
	type NodeId,
	type QuerySecurityClasses,
	type SetSecurityClass,
	ValueDB,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createThrowingMap } from "@zwave-js/shared";
import type { HostIDs, ZWaveApplicationHost } from "./ZWaveHost";

export interface CreateTestingHostOptions extends HostIDs {
	getSafeCCVersion: ZWaveApplicationHost["getSafeCCVersion"];
	getSupportedCCVersion?: ZWaveApplicationHost["getSupportedCCVersion"];
}

export type BaseTestNode =
	& NodeId
	& QuerySecurityClasses
	& SetSecurityClass
	& IsCCSecure
	& GetEndpoint<EndpointId & IsCCSecure>;

export type TestingHost<
	TNode extends BaseTestNode,
> =
	& ZWaveApplicationHost<TNode>
	& {
		setNode(nodeId: number, node: TNode): void;
	};

/** Creates a {@link ZWaveApplicationHost} that can be used for testing */
export function createTestingHost<
	TNode extends BaseTestNode,
>(
	options: Partial<CreateTestingHostOptions> = {},
): TestingHost<TNode> {
	const valuesStorage = new Map();
	const metadataStorage = new Map();
	const valueDBCache = new Map<number, ValueDB>();
	const nodes = createThrowingMap<number, TNode>((nodeId) => {
		throw new ZWaveError(
			`Node ${nodeId} was not found!`,
			ZWaveErrorCodes.Controller_NodeNotFound,
		);
	});

	const ret: TestingHost<TNode> = {
		homeId: options.homeId ?? 0x7e570001,
		ownNodeId: options.ownNodeId ?? 1,
		securityManager: undefined,
		securityManager2: undefined,
		securityManagerLR: undefined,
		getDeviceConfig: () => undefined,
		lookupManufacturer: () => undefined,
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
		getInterviewOptions() {
			return {};
		},
		getUserPreferences() {
			return undefined;
		},
		getCommunicationTimeouts() {
			return {
				refreshValue: 5000,
				refreshValueAfterTransition: 1000,
			};
		},
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
		getSafeCCVersion: options.getSafeCCVersion ?? (() => 100),
		getSupportedCCVersion: (cc, nodeId, endpoint) => {
			return options.getSupportedCCVersion?.(cc, nodeId, endpoint)
				?? options.getSafeCCVersion?.(cc, nodeId, endpoint)
				?? 100;
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
		sendCommand: async (_command, _options) => {
			return undefined as any;
		},
		schedulePoll: (_nodeId, _valueId, _options) => {
			return false;
		},
	};
	return ret;
}
