import { ConfigManager } from "@zwave-js/config";
import { ValueDB, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { createThrowingMap, type ThrowingMap } from "@zwave-js/shared";
import type { Overwrite } from "alcalzone-shared/types";
import type { ZWaveHost } from "./ZWaveHost";
import type { ZWaveNodeBase } from "./ZWaveNodeBase";

export interface CreateTestingHostOptions {
	homeId: ZWaveHost["homeId"];
	ownNodeId: ZWaveHost["ownNodeId"];
	getSafeCCVersionForNode: ZWaveHost["getSafeCCVersionForNode"];
}

export type TestingHost = Overwrite<
	ZWaveHost,
	{ nodes: ThrowingMap<number, ZWaveNodeBase> }
>;

/** Creates a {@link ZWaveHost} that can be used for testing */
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
		securityManager: undefined,
		securityManager2: undefined,
		options: {
			attempts: {
				nodeInterview: 1,
				openSerialPort: 1,
				sendData: 3,
				controller: 3,
			},
		},
		controllerLog: new Proxy({} as any, {
			get() {
				return () => {
					/* intentionally empty */
				};
			},
		}),
		configManager: new ConfigManager(),
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
	};
	return ret;
}
