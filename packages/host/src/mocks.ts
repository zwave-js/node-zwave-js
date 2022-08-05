/* eslint-disable @typescript-eslint/require-await */
import { ConfigManager } from "@zwave-js/config";
import type { IZWaveNode } from "@zwave-js/core";
import { ValueDB, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { createThrowingMap, type ThrowingMap } from "@zwave-js/shared";
import type { Overwrite } from "alcalzone-shared/types";
import type { ZWaveApplicationHost, ZWaveHost } from "./ZWaveHost";

export interface CreateTestingHostOptions {
	homeId: ZWaveHost["homeId"];
	ownNodeId: ZWaveHost["ownNodeId"];
	getSafeCCVersionForNode: ZWaveHost["getSafeCCVersionForNode"];
}

export type TestingHost = Overwrite<
	ZWaveApplicationHost,
	{ nodes: ThrowingMap<number, IZWaveNode> }
>;

/** Creates a {@link ZWaveApplicationHost} that can be used for testing */
export function createTestingHost(
	options: Partial<CreateTestingHostOptions> = {},
): TestingHost {
	let callbackId = 0xff;
	const getNextCallbackId = () => {
		callbackId = (callbackId + 1) & 0xff;
		if (callbackId < 1) callbackId = 1;
		return callbackId;
	};

	const valuesStorage = new Map();
	const metadataStorage = new Map();
	const valueDBCache = new Map<number, ValueDB>();

	const ret: TestingHost = {
		homeId: options.homeId ?? 0x7e570001,
		ownNodeId: options.ownNodeId ?? 1,
		isControllerNode: (nodeId) => nodeId === ret.ownNodeId,
		securityManager: undefined,
		securityManager2: undefined,
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
		nodes: createThrowingMap((nodeId) => {
			throw new ZWaveError(
				`Node ${nodeId} was not found!`,
				ZWaveErrorCodes.Controller_NodeNotFound,
			);
		}),
		getSafeCCVersionForNode: options.getSafeCCVersionForNode ?? (() => 100),
		getNextCallbackId,
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
			const node = ret.nodes.get(nodeId);
			const endpoint = node?.getEndpoint(endpointIndex);
			return (
				node?.isSecure !== false &&
				!!(endpoint ?? node)?.isCCSecure(ccId) &&
				!!(ret.securityManager || ret.securityManager2)
			);
		},
		getHighestSecurityClass: (nodeId) => {
			const node = ret.nodes.getOrThrow(nodeId);
			return node.getHighestSecurityClass();
		},
		hasSecurityClass: (nodeId, securityClass) => {
			const node = ret.nodes.getOrThrow(nodeId);
			return node.hasSecurityClass(securityClass);
		},
		setSecurityClass: (nodeId, securityClass, granted) => {
			const node = ret.nodes.getOrThrow(nodeId);
			node.setSecurityClass(securityClass, granted);
		},
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
