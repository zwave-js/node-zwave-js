import { type GetDeviceConfig } from "@zwave-js/config";
import {
	type ControlsCC,
	type EndpointId,
	type GetAllNodes,
	type GetEndpoint,
	type GetNode,
	type GetSupportedCCVersion,
	type GetValueDB,
	type HostIDs,
	type IsCCSecure,
	type ListenBehavior,
	type LogNode,
	type NodeId,
	type QuerySecurityClasses,
	type SetSecurityClass,
	type SupportsCC,
	ValueDB,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createThrowingMap } from "@zwave-js/shared";

// FIXME: At some points this module should be moved into @zwave-js/testing,
// but this doesn't work right now due to circular dependencies

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
		logNode: () => {},
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
		getSupportedCCVersion: (cc, nodeId, endpoint) => {
			return nodes.get(nodeId)?.getEndpoint(endpoint ?? 0)?.getCCVersion(
				cc,
			) ?? 0;
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
	};
	return ret;
}
