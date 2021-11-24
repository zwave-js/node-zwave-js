import { CommandClasses, NodeProtocolInfo, NodeType } from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import {
	ApplicationCCsFile,
	ApplicationCCsFileID,
} from "./files/ApplicationCCsFile";
import {
	ApplicationDataFile,
	ApplicationDataFileID,
} from "./files/ApplicationDataFile";
import {
	ApplicationRFConfigFile,
	ApplicationRFConfigFileID,
} from "./files/ApplicationRFConfigFile";
import {
	ControllerInfoFile,
	ControllerInfoFileID,
} from "./files/ControllerInfoFile";
import {
	nodeIdToNodeInfoFileIDV0,
	nodeIdToNodeInfoFileIDV1,
	NodeInfo,
	NodeInfoFileV0,
	NodeInfoFileV1,
} from "./files/NodeInfoFiles";
import { NVMFile } from "./files/NVMFile";
import {
	ProtocolAppRouteLockNodeMaskFile,
	ProtocolAppRouteLockNodeMaskFileID,
	ProtocolNodeListFile,
	ProtocolNodeListFileID,
	ProtocolPendingDiscoveryNodeMaskFile,
	ProtocolPendingDiscoveryNodeMaskFileID,
	ProtocolRouteCacheExistsNodeMaskFile,
	ProtocolRouteCacheExistsNodeMaskFileID,
	ProtocolRouteSlaveSUCNodeMaskFile,
	ProtocolRouteSlaveSUCNodeMaskFileID,
	ProtocolSUCPendingUpdateNodeMaskFile,
	ProtocolSUCPendingUpdateNodeMaskFileID,
	ProtocolVirtualNodeMaskFile,
	ProtocolVirtualNodeMaskFileID,
} from "./files/ProtocolNodeMaskFiles";
import {
	nodeIdToRouteCacheFileIDV0,
	nodeIdToRouteCacheFileIDV1,
	Route,
	RouteCache,
	RouteCacheFileV0,
	RouteCacheFileV1,
} from "./files/RouteCacheFiles";
import {
	SUCUpdateEntriesFile,
	SUCUpdateEntriesFileID,
	SUCUpdateEntry,
} from "./files/SUCUpdateEntriesFile";
import {
	ApplicationVersionFile,
	ApplicationVersionFileID,
	ProtocolVersionFile,
	ProtocolVersionFileID,
} from "./files/VersionFiles";
import type { NVMObject } from "./object";
import { mapToObject } from "./utils";

export interface NVMJSON {
	controller: NVMJSONController;
	nodes: Record<number, NVMJSONNode>;
}

export interface NVMJSONController {
	protocolVersion: string;
	applicationVersion: string;
	format: number;
	homeId: string;
	nodeId: number;
	lastNodeId: number;
	staticControllerNodeId: number;
	sucLastIndex: number;
	controllerConfiguration: number;
	sucUpdateEntries: SUCUpdateEntry[];
	sucAwarenessPushNeeded?: number | null;
	maxNodeId: number;
	reservedId: number;
	systemState: number;
	lastNodeIdLR?: number | null;
	maxNodeIdLR?: number | null;
	reservedIdLR?: number | null;
	primaryLongRangeChannelId?: number | null;
	dcdcConfig?: number | null;
	rfConfig?: NVMJSONControllerRFConfig | null;

	commandClasses: {
		includedInsecurely: CommandClasses[];
		includedSecurelyInsecureCCs: CommandClasses[];
		includedSecurelySecureCCs: CommandClasses[];
	};

	applicationData?: string | null;
}

export interface NVMJSONControllerRFConfig {
	rfRegion: number; // TODO: Should be RF Region
	txPower: number;
	measured0dBm: number;
	enablePTI: number | null;
	maxTXPower: number | null;
}

export interface NVMJSONPhysicalNode
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
	isVirtual: boolean;

	genericDeviceClass: number;
	specificDeviceClass: number | null;
	neighbors: number[];
	sucUpdateIndex: number;

	appRouteLock: boolean;
	routeSlaveSUC: boolean;
	sucPendingUpdate: boolean;
	pendingDiscovery: boolean;

	lwr?: Route | null;
	nlwr?: Route | null;
}

export interface NVMJSONVirtualNode {
	isVirtual: true;
}

export type NVMJSONNode = NVMJSONPhysicalNode | NVMJSONVirtualNode;

function createEmptyPhysicalNode(): NVMJSONPhysicalNode {
	return {
		isVirtual: false,
		isListening: false,
		isFrequentListening: false,
		isRouting: false,
		supportedDataRates: [],
		protocolVersion: 0,
		optionalFunctionality: false,
		nodeType: NodeType["Routing End Node"],
		supportsSecurity: false,
		supportsBeaming: false,
		genericDeviceClass: 0,
		specificDeviceClass: null,
		neighbors: [],
		sucUpdateIndex: 0,
		appRouteLock: false,
		routeSlaveSUC: false,
		sucPendingUpdate: false,
		pendingDiscovery: false,
		lwr: null,
		nlwr: null,
	};
}

/** Converts a compressed set of NVM objects to a JSON representation */
export function nvmObjectsToJSON(
	applicationObjects: ReadonlyMap<number, NVMObject>,
	protocolObjects: ReadonlyMap<number, NVMObject>,
): NVMJSON {
	const nodes = new Map<number, NVMJSONNode>();
	const getNode = (id: number): NVMJSONNode => {
		if (!nodes.has(id)) nodes.set(id, createEmptyPhysicalNode());
		return nodes.get(id)!;
	};

	const getObject = (
		id: number | ((id: number) => boolean),
	): NVMObject | undefined => {
		if (typeof id === "number") {
			return protocolObjects.get(id) ?? applicationObjects.get(id);
		} else {
			for (const [key, obj] of protocolObjects) {
				if (id(key)) return obj;
			}
			for (const [key, obj] of applicationObjects) {
				if (id(key)) return obj;
			}
		}
	};

	const getObjectOrThrow = (
		id: number | ((id: number) => boolean),
	): NVMObject => {
		const ret = getObject(id);
		if (ret) return ret;
		throw new Error(`Object not found`);
	};

	const getFileOrThrow = <T extends NVMFile>(
		id: number | ((id: number) => boolean),
	): T => {
		const obj = getObjectOrThrow(id);
		return NVMFile.from(obj) as T;
	};

	const getFile = <T extends NVMFile>(
		id: number | ((id: number) => boolean),
	): T | undefined => {
		const obj = getObject(id);
		if (!obj) return undefined;
		return NVMFile.from(obj) as T;
	};

	// Figure out how to parse the individual files
	const protocolVersionFile = getFileOrThrow<ProtocolVersionFile>(
		ProtocolVersionFileID,
	);
	const protocolFileFormat = protocolVersionFile.format;

	// Figure out which nodes exist
	const nodeIds = getFileOrThrow<ProtocolNodeListFile>(
		ProtocolNodeListFileID,
	).nodeIds;

	// Read all flags for all nodes
	const appRouteLock = new Set(
		getFileOrThrow<ProtocolAppRouteLockNodeMaskFile>(
			ProtocolAppRouteLockNodeMaskFileID,
		).nodeIds,
	);
	const routeSlaveSUC = new Set(
		getFileOrThrow<ProtocolRouteSlaveSUCNodeMaskFile>(
			ProtocolRouteSlaveSUCNodeMaskFileID,
		).nodeIds,
	);
	const sucPendingUpdate = new Set(
		getFileOrThrow<ProtocolSUCPendingUpdateNodeMaskFile>(
			ProtocolSUCPendingUpdateNodeMaskFileID,
		).nodeIds,
	);
	const isVirtual = new Set(
		getFileOrThrow<ProtocolVirtualNodeMaskFile>(
			ProtocolVirtualNodeMaskFileID,
		).nodeIds,
	);
	const pendingDiscovery = new Set(
		getFileOrThrow<ProtocolPendingDiscoveryNodeMaskFile>(
			ProtocolPendingDiscoveryNodeMaskFileID,
		).nodeIds,
	);
	const routeCacheExists = new Set(
		getFileOrThrow<ProtocolRouteCacheExistsNodeMaskFile>(
			ProtocolRouteCacheExistsNodeMaskFileID,
		).nodeIds,
	);

	// And create each node entry, including virtual ones
	for (const id of nodeIds) {
		const node = getNode(id) as NVMJSONPhysicalNode;

		const rememberOnlyVirtual = () => {
			nodes.set(id, {
				isVirtual: true,
			});
		};

		// Find node info
		let nodeInfo: NodeInfo;
		try {
			if (protocolFileFormat === 0) {
				const fileId = nodeIdToNodeInfoFileIDV0(id);
				const file = getFileOrThrow<NodeInfoFileV0>(fileId);
				nodeInfo = file.nodeInfo;
			} else if (protocolFileFormat <= 2) {
				const fileId = nodeIdToNodeInfoFileIDV1(id);
				const file = getFileOrThrow<NodeInfoFileV1>(fileId);
				nodeInfo = file.nodeInfos.find((i) => i.nodeId === id)!;
			} else {
				throw new Error(
					`Unsupported protocol file format: ${protocolFileFormat}`,
				);
			}
		} catch (e: any) {
			if (e.message.includes("Object not found")) {
				rememberOnlyVirtual();
				continue;
			}
			throw e;
		}

		Object.assign(node, nodeInfo);

		// Evaluate flags
		node.isVirtual = isVirtual.has(id);
		node.appRouteLock = appRouteLock.has(id);
		node.routeSlaveSUC = routeSlaveSUC.has(id);
		node.sucPendingUpdate = sucPendingUpdate.has(id);
		node.pendingDiscovery = pendingDiscovery.has(id);
		if (routeCacheExists.has(id)) {
			let routeCache: RouteCache;
			if (protocolFileFormat === 0) {
				const fileId = nodeIdToRouteCacheFileIDV0(id);
				const file = getFileOrThrow<RouteCacheFileV0>(fileId);
				routeCache = file.routeCache;
			} else if (protocolFileFormat <= 2) {
				const fileId = nodeIdToRouteCacheFileIDV1(id);
				const file = getFileOrThrow<RouteCacheFileV1>(fileId);
				routeCache = file.routeCaches.find((i) => i.nodeId === id)!;
			} else {
				throw new Error(
					`Unsupported protocol file format: ${protocolFileFormat}`,
				);
			}
			node.lwr = routeCache.lwr;
			node.nlwr = routeCache.nlwr;
		}

		// @ts-expect-error Some fields include a nodeId, but we don't need it
		delete node.nodeId;
	}

	// Now read info about the controller
	const controllerInfoFile =
		getFileOrThrow<ControllerInfoFile>(ControllerInfoFileID);
	const sucUpdateEntries = getFileOrThrow<SUCUpdateEntriesFile>(
		SUCUpdateEntriesFileID,
	).updateEntries;

	const rfConfigFile = getFile<ApplicationRFConfigFile>(
		ApplicationRFConfigFileID,
	);
	const applicationVersionFile = getFileOrThrow<ApplicationVersionFile>(
		ApplicationVersionFileID,
	);
	const applicationCCsFile =
		getFileOrThrow<ApplicationCCsFile>(ApplicationCCsFileID);
	const applicationDataFile = getFile<ApplicationDataFile>(
		ApplicationDataFileID,
	);

	const controllerProps = [
		"nodeId",
		"lastNodeId",
		"staticControllerNodeId",
		"sucLastIndex",
		"controllerConfiguration",
		"sucAwarenessPushNeeded",
		"maxNodeId",
		"reservedId",
		"systemState",
		"lastNodeIdLR",
		"maxNodeIdLR",
		"reservedIdLR",
		"primaryLongRangeChannelId",
		"dcdcConfig",
	] as const;
	const controller: NVMJSONController = {
		protocolVersion: `${protocolVersionFile.major}.${protocolVersionFile.minor}.${protocolVersionFile.patch}`,
		applicationVersion: `${applicationVersionFile.major}.${applicationVersionFile.minor}.${applicationVersionFile.patch}`,
		format: protocolFileFormat,
		homeId: `0x${controllerInfoFile.homeId.toString("hex")}`,
		...pick(controllerInfoFile, controllerProps),
		commandClasses: pick(applicationCCsFile, [
			"includedInsecurely",
			"includedSecurelyInsecureCCs",
			"includedSecurelySecureCCs",
		]),
		...(rfConfigFile
			? {
					rfConfig: {
						rfRegion: rfConfigFile.rfRegion,
						txPower: rfConfigFile.txPower,
						measured0dBm: rfConfigFile.measured0dBm,
						enablePTI: rfConfigFile.enablePTI ?? null,
						maxTXPower: rfConfigFile.maxTXPower ?? null,
					},
			  }
			: {}),
		sucUpdateEntries,
		applicationData: applicationDataFile?.data.toString("hex") ?? null,
	};

	// Make sure all props are defined
	const optionalControllerProps = [
		"sucAwarenessPushNeeded",
		"lastNodeIdLR",
		"maxNodeIdLR",
		"reservedIdLR",
		"primaryLongRangeChannelId",
		"dcdcConfig",
		"rfConfig",
		"applicationData",
	] as const;
	for (const prop of optionalControllerProps) {
		if (controller[prop] === undefined) controller[prop] = null;
	}

	const ret: NVMJSON = {
		controller,
		nodes: mapToObject(nodes),
	};

	return ret;
}
