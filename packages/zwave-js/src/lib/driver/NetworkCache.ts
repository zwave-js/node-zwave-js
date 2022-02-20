import type { JsonlDB } from "@alcalzone/jsonl-db";
import type { CommandClasses } from "@zwave-js/core";
import { num2hex, pickDeep } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";
import path from "path";
import type { FileSystem } from "./FileSystem";

/**
 * Defines the keys that are used to store certain properties in the network cache.
 */
export const cacheKeys = {
	controller: {
		provisioningList: "controller.provisioningList",
		supportsSoftReset: "controller.supportsSoftReset",
	},
	node: (nodeId: number) => ({
		_baseKey: `node.${nodeId}`,
		interviewStage: `node.${nodeId}.interviewStage`,
		deviceClass: `node.${nodeId}.deviceClass`,
		isListening: `node.${nodeId}.isListening`,
		isFrequentListening: `node.${nodeId}.isFrequentListening`,
		isRouting: `node.${nodeId}.isRouting`,
		supportedDataRates: `node.${nodeId}.supportedDataRates`,
		protocolVersion: `node.${nodeId}.protocolVersion`,
		nodeType: `node.${nodeId}.nodeType`,
		supportsSecurity: `node.${nodeId}.supportsSecurity`,
		supportsBeaming: `node.${nodeId}.supportsBeaming`,
		securityClasses: `node.${nodeId}.securityClasses`,
		dsk: `node.${nodeId}.dsk`,
		commandClass: (ccId: CommandClasses) => {
			const ccAsHex = num2hex(ccId);
			const baseKey = `node.${nodeId}.commandClass.${ccAsHex}`;
			return {
				_baseKey: baseKey,
				name: `${baseKey}.name`,
				endpoint: (index: number) => `${baseKey}.endpoints.${index}`,
			};
		},
	}),
} as const;

export const cacheKeyUtils = {
	nodeIdFromKey: (key: string): number | undefined => {
		const match = /^node\.(?<nodeId>\d+)\./.exec(key);
		if (match) {
			return parseInt(match.groups!.nodeId, 10);
		}
	},
	isEndpointKey: (key: string): boolean => {
		return /endpoints\.(?<index>\d+)$/.test(key);
	},
	endpointIndexFromKey: (key: string): number | undefined => {
		const match = /endpoints\.(?<index>\d+)$/.exec(key);
		if (match) {
			return parseInt(match.groups!.index, 10);
		}
	},
} as const;

/** Defines the JSON paths that were used to store certain properties in the legacy network cache */
const legacyPaths = {
	// These seem to duplicate the ones in cacheKeys, but this allows us to change
	// something in the future without breaking migration
	controller: {
		provisioningList: "controller.provisioningList",
		supportsSoftReset: "controller.supportsSoftReset",
	},
	node: {
		// These are relative to the node object
		interviewStage: `interviewStage`,
		deviceClass: `deviceClass`,
		isListening: `isListening`,
		isFrequentListening: `isFrequentListening`,
		isRouting: `isRouting`,
		supportedDataRates: `supportedDataRates`,
		protocolVersion: `protocolVersion`,
		nodeType: `nodeType`,
		supportsSecurity: `supportsSecurity`,
		supportsBeaming: `supportsBeaming`,
		securityClasses: `securityClasses`,
		dsk: `dsk`,
	},
	commandClass: {
		// These are relative to the commandClasses object
		name: `name`,
		endpoint: (index: number) => `endpoints.${index}`,
	},
} as const;

export async function migrateLegacyNetworkCache(
	homeId: number,
	networkCache: JsonlDB,
	storageDriver: FileSystem,
	cacheDir: string,
): Promise<void> {
	const cacheFile = path.join(cacheDir, `${homeId.toString(16)}.json`);
	if (!(await storageDriver.pathExists(cacheFile))) return;
	const legacy = JSON.parse(await storageDriver.readFile(cacheFile, "utf8"));

	const jsonl = networkCache;
	function tryMigrate(
		targetKey: string,
		source: Record<string, any>,
		sourcePath: string,
	): void {
		const val = pickDeep(source, sourcePath);
		if (val != undefined) jsonl.set(targetKey, val);
	}

	// Translate all possible entries

	// Controller provisioning list and supportsSoftReset info
	tryMigrate(
		cacheKeys.controller.provisioningList,
		legacy,
		legacyPaths.controller.provisioningList,
	);
	tryMigrate(
		cacheKeys.controller.supportsSoftReset,
		legacy,
		legacyPaths.controller.supportsSoftReset,
	);

	// All nodes, ...
	if (isObject(legacy.nodes)) {
		for (const node of Object.values<any>(legacy.nodes)) {
			if (!isObject(node) || typeof node.id !== "number") continue;
			const nodeCacheKeys = cacheKeys.node(node.id);

			// ... their properties
			tryMigrate(
				nodeCacheKeys.interviewStage,
				node,
				legacyPaths.node.interviewStage,
			);
			tryMigrate(
				nodeCacheKeys.deviceClass,
				node,
				legacyPaths.node.deviceClass,
			);
			tryMigrate(
				nodeCacheKeys.isListening,
				node,
				legacyPaths.node.isListening,
			);
			tryMigrate(
				nodeCacheKeys.isFrequentListening,
				node,
				legacyPaths.node.isFrequentListening,
			);
			tryMigrate(
				nodeCacheKeys.isRouting,
				node,
				legacyPaths.node.isRouting,
			);
			tryMigrate(
				nodeCacheKeys.supportedDataRates,
				node,
				legacyPaths.node.supportedDataRates,
			);
			tryMigrate(
				nodeCacheKeys.protocolVersion,
				node,
				legacyPaths.node.protocolVersion,
			);
			tryMigrate(nodeCacheKeys.nodeType, node, legacyPaths.node.nodeType);
			tryMigrate(
				nodeCacheKeys.supportsSecurity,
				node,
				legacyPaths.node.supportsSecurity,
			);
			tryMigrate(
				nodeCacheKeys.supportsBeaming,
				node,
				legacyPaths.node.supportsBeaming,
			);
			tryMigrate(
				nodeCacheKeys.securityClasses,
				node,
				legacyPaths.node.securityClasses,
			);
			tryMigrate(nodeCacheKeys.dsk, node, legacyPaths.node.dsk);

			// ... and command classes
			if (isObject(node.commandClasses)) {
				for (const [ccIdHex, cc] of Object.entries<any>(
					node.commandClasses,
				)) {
					const ccId = parseInt(ccIdHex, 16);
					const cacheKey = nodeCacheKeys.commandClass(ccId);

					tryMigrate(
						cacheKey.name,
						cc,
						legacyPaths.commandClass.name,
					);
					if (isObject(cc.endpoints)) {
						for (const endpointId of Object.keys(cc.endpoints)) {
							const endpointIndex = parseInt(endpointId, 10);
							tryMigrate(
								cacheKey.endpoint(endpointIndex),
								cc,
								legacyPaths.commandClass.endpoint(
									endpointIndex,
								),
							);
						}
					}
				}
			}
		}
	}
}
