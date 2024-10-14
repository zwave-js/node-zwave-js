/* eslint-disable @typescript-eslint/require-await */
import { ConfigManager } from "@zwave-js/config";
import {
	type EndpointId,
	type GetEndpoint,
	type IsCCSecure,
	NodeIDType,
	type NodeId,
	type QuerySecurityClasses,
	type SetSecurityClass,
	ValueDB,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createThrowingMap } from "@zwave-js/shared";
import type { HostIDs, ZWaveApplicationHost, ZWaveHost } from "./ZWaveHost";

export interface CreateTestingHostOptions extends HostIDs {
	getSafeCCVersion: ZWaveHost["getSafeCCVersion"];
	getSupportedCCVersion?: ZWaveHost["getSupportedCCVersion"];
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
	& Omit<
		ZWaveApplicationHost<TNode>,
		"__internalIsMockNode"
	>
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
		nodeIdType: NodeIDType.Short,
		isControllerNode: (nodeId) => nodeId === ret.ownNodeId,
		securityManager: undefined,
		securityManager2: undefined,
		securityManagerLR: undefined,
		getDeviceConfig: undefined,
		controllerLog: new Proxy({} as any, {
			get() {
				return () => {
					/* intentionally empty */
				};
			},
		}),
		configManager: new ConfigManager(),
		options: {
			attempts: {
				nodeInterview: 1,
				// openSerialPort: 1,
				sendData: 3,
				controller: 3,
			},
			timeouts: {
				refreshValue: 5000,
				refreshValueAfterTransition: 1000,
			},
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
		getSupportedCCVersion: options.getSupportedCCVersion
			?? options.getSafeCCVersion
			?? (() => 100),
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
		isCCSecure: (ccId, nodeId, endpointIndex = 0) => {
			const node = nodes.get(nodeId);
			const endpoint = node?.getEndpoint(endpointIndex);
			return (
				node?.isSecure !== false
				&& !!(endpoint ?? node)?.isCCSecure(ccId)
				&& !!(ret.securityManager || ret.securityManager2)
			);
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
		waitForCommand: async (_predicate, _timeout) => {
			return undefined as any;
		},
		schedulePoll: (_nodeId, _valueId, _options) => {
			return false;
		},
	};
	return ret;
}
