import {
	CommandClasses,
	NodeProtocolInfo,
	NodeType,
	stripUndefined,
} from "@zwave-js/core";
import { cloneDeep, pick } from "@zwave-js/shared";
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
	ApplicationTypeFile,
	ApplicationTypeFileID,
} from "./files/ApplicationTypeFile";
import {
	ControllerInfoFile,
	ControllerInfoFileID,
	ControllerInfoFileOptions,
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
	getEmptyRoute,
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
import { parseNVM } from "./nvm";
import type { NVMObject } from "./object";
import { mapToObject } from "./utils";

export interface NVMJSON {
	format: number;
	controller: NVMJSONController;
	nodes: Record<number, NVMJSONNode>;
}

export interface NVMJSONController {
	protocolVersion: string;
	applicationVersion: string;
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

	listening: boolean;
	optionalFunctionality: boolean;
	genericDeviceClass: number;
	specificDeviceClass: number;

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

export interface NVMJSONNodeWithInfo
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

// Unlike NVMJSONNodeWithInfo this does not carry any node information
export interface NVMJSONVirtualNode {
	isVirtual: true;
}

export type NVMJSONNode = NVMJSONNodeWithInfo | NVMJSONVirtualNode;

function nodeHasInfo(node: NVMJSONNode): node is NVMJSONNodeWithInfo {
	return !node.isVirtual || Object.keys(node).length > 1;
}

function createEmptyPhysicalNode(): NVMJSONNodeWithInfo {
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
		const node = getNode(id) as NVMJSONNodeWithInfo;

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
			} else if (protocolFileFormat <= 3) {
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
			} else if (protocolFileFormat <= 3) {
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
	const applicationTypeFile = getFileOrThrow<ApplicationTypeFile>(
		ApplicationTypeFileID,
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
		homeId: `0x${controllerInfoFile.homeId.toString("hex")}`,
		...pick(controllerInfoFile, controllerProps),
		...pick(applicationTypeFile, [
			"listening",
			"optionalFunctionality",
			"genericDeviceClass",
			"specificDeviceClass",
		]),
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
		format: protocolFileFormat,
		controller,
		nodes: mapToObject(nodes),
	};

	return ret;
}

/** Reads an NVM buffer and returns its JSON representation */
export function nvmToJSON(buffer: Buffer, debugLogs: boolean = false): NVMJSON {
	const nvm = parseNVM(buffer, debugLogs);
	return nvmObjectsToJSON(nvm.applicationObjects, nvm.protocolObjects);
}

function nvmJSONNodeToNodeInfo(
	nodeId: number,
	node: NVMJSONNodeWithInfo,
): NodeInfo {
	return {
		nodeId,
		...pick(node, [
			"isListening",
			"isFrequentListening",
			"isRouting",
			"supportedDataRates",
			"protocolVersion",
			"optionalFunctionality",
			"nodeType",
			"supportsSecurity",
			"supportsBeaming",
			"genericDeviceClass",
			"specificDeviceClass",
			"neighbors",
			"sucUpdateIndex",
		]),
	};
}

function nvmJSONControllerToFileOptions(
	ctrlr: NVMJSONController,
): ControllerInfoFileOptions {
	const ret = {
		homeId: Buffer.from(ctrlr.homeId.replace(/^0x/, ""), "hex"),
		nodeId: ctrlr.nodeId,
		lastNodeId: ctrlr.lastNodeId,
		staticControllerNodeId: ctrlr.staticControllerNodeId,
		sucLastIndex: ctrlr.sucLastIndex,
		controllerConfiguration: ctrlr.controllerConfiguration,
		maxNodeId: ctrlr.maxNodeId,
		reservedId: ctrlr.reservedId,
		systemState: ctrlr.systemState,
	} as ControllerInfoFileOptions;
	if (ctrlr.sucAwarenessPushNeeded != undefined) {
		// @ts-expect-error We're dealing with a conditional object here
		// TS doesn't like that.
		ret.sucAwarenessPushNeeded = ctrlr.sucAwarenessPushNeeded;
	} else {
		Object.assign(
			ret,
			stripUndefined(
				pick(ctrlr, [
					"sucAwarenessPushNeeded",
					"lastNodeIdLR",
					"maxNodeIdLR",
					"reservedIdLR",
					"primaryLongRangeChannelId",
					"dcdcConfig",
				]),
			),
		);
	}
	return ret;
}

export function jsonToNVM_v3(
	json: NVMJSON,
	major: number,
	minor: number,
	patch: number,
): {
	applicationObjects: Map<number, NVMObject>;
	protocolObjects: Map<number, NVMObject>;
} {
	const target = cloneDeep(json);
	target.format = 3;

	const applicationObjects = new Map<number, NVMObject>();
	const protocolObjects = new Map<number, NVMObject>();

	const addApplicationObjects = (...objects: NVMObject[]) => {
		for (const o of objects) {
			applicationObjects.set(o.key, o);
		}
	};
	const addProtocolObjects = (...objects: NVMObject[]) => {
		for (const o of objects) {
			protocolObjects.set(o.key, o);
		}
	};

	// {.key = ZAF_FILE_ID_APP_VERSION, .size = ZAF_FILE_SIZE_APP_VERSION, .name = "APP_VERSION"},
	// {.key = FILE_ID_APPLICATIONSETTINGS, .size = FILE_SIZE_APPLICATIONSETTINGS, .name = "APPLICATIONSETTINGS"},
	// {.key = FILE_ID_APPLICATIONCMDINFO, .size = FILE_SIZE_APPLICATIONCMDINFO, .name = "APPLICATIONCMDINFO"},
	// {.key = FILE_ID_APPLICATIONCONFIGURATION, .size = FILE_SIZE_APPLICATIONCONFIGURATION, .name = "APPLICATIONCONFIGURATION"},
	// {.key = FILE_ID_APPLICATIONDATA, .size = FILE_SIZE_APPLICATIONDATA, .name = "APPLICATIONDATA"}

	const [applMajor, applMinor, applPatch] =
		target.controller.applicationVersion.split(".").map((i) => parseInt(i));
	const applVersionFile = new ApplicationVersionFile({
		format: target.format,
		major: applMajor,
		minor: applMinor,
		patch: applPatch,
	});
	addProtocolObjects(applVersionFile.serialize());

	const applTypeFile = new ApplicationTypeFile(
		pick(target.controller, [
			"listening",
			"optionalFunctionality",
			"genericDeviceClass",
			"specificDeviceClass",
		]),
	);
	addApplicationObjects(applTypeFile.serialize());

	const applCCsFile = new ApplicationCCsFile(
		pick(target.controller.commandClasses, [
			"includedInsecurely",
			"includedSecurelyInsecureCCs",
			"includedSecurelySecureCCs",
		]),
	);
	addApplicationObjects(applCCsFile.serialize());

	if (target.controller.rfConfig) {
		const applRFConfigFile = new ApplicationRFConfigFile({
			...pick(target.controller.rfConfig, [
				"rfRegion",
				"txPower",
				"measured0dBm",
			]),
			enablePTI: target.controller.rfConfig.enablePTI ?? undefined,
			maxTXPower: target.controller.rfConfig.maxTXPower ?? undefined,
		});
		addApplicationObjects(applRFConfigFile.serialize());
	}

	if (target.controller.applicationData) {
		// TODO: ensure this is 512 bytes long
		const applDataFile = new ApplicationDataFile({
			data: Buffer.from(target.controller.applicationData, "hex"),
		});
		addApplicationObjects(applDataFile.serialize());
	}

	// Protocol files

	// ✔ { .key = FILE_ID_ZW_VERSION, .size = FILE_SIZE_ZW_VERSION, .name = "ZW_VERSION"},
	// ✔ { .key = FILE_ID_NODEINFO_V1, .size = FILE_SIZE_NODEINFO_V1, .name = "NODEINFO_V1", .optional = true, .num_keys = ZW_CLASSIC_MAX_NODES / NODEINFOS_PER_FILE},
	// ✔ { .key = FILE_ID_NODEROUTECAHE_V1, .size = FILE_SIZE_NODEROUTECAHE_V1, .name = "NODEROUTECAHE_V1", .optional = true, .num_keys = ZW_CLASSIC_MAX_NODES / NODEROUTECACHES_PER_FILE},
	// { .key = FILE_ID_PREFERREDREPEATERS, .size = FILE_SIZE_PREFERREDREPEATERS, .name = "PREFERREDREPEATERS", .optional = true},
	// ✔ { .key = FILE_ID_SUCNODELIST, .size = FILE_SIZE_SUCNODELIST, .name = "SUCNODELIST"},
	// ✔ { .key = FILE_ID_CONTROLLERINFO, .size = FILE_SIZE_CONTROLLERINFO_NVM715, .name = "CONTROLLERINFO"},
	// ✔ { .key = FILE_ID_NODE_STORAGE_EXIST, .size = FILE_SIZE_NODE_STORAGE_EXIST, .name = "NODE_STORAGE_EXIST"},
	// ✔ { .key = FILE_ID_NODE_ROUTECACHE_EXIST, .size = FILE_SIZE_NODE_ROUTECACHE_EXIST, .name = "NODE_ROUTECACHE_EXIST"},
	// { .key = FILE_ID_LRANGE_NODE_EXIST, .size = FILE_SIZE_LRANGE_NODE_EXIST, .name = "LRANGE_NODE_EXIST"},
	// ✔ { .key = FILE_ID_APP_ROUTE_LOCK_FLAG, .size = FILE_SIZE_APP_ROUTE_LOCK_FLAG, .name = "APP_ROUTE_LOCK_FLAG"},
	// ✔ { .key = FILE_ID_ROUTE_SLAVE_SUC_FLAG, .size = FILE_SIZE_ROUTE_SLAVE_SUC_FLAG, .name = "ROUTE_SLAVE_SUC_FLAG"},
	// ✔ { .key = FILE_ID_SUC_PENDING_UPDATE_FLAG, .size = FILE_SIZE_SUC_PENDING_UPDATE_FLAG, .name = "SUC_PENDING_UPDATE_FLAG" },
	// ✔ { .key = FILE_ID_BRIDGE_NODE_FLAG, .size = FILE_SIZE_BRIDGE_NODE_FLAG, .name = "BRIDGE_NODE_FLAG"},
	// ✔ { .key = FILE_ID_PENDING_DISCOVERY_FLAG, .size = FILE_SIZE_PENDING_DISCOVERY_FLAG, .name = "PENDING_DISCOVERY_FLAG"},

	const protocolVersionFile = new ProtocolVersionFile({
		format: target.format,
		major,
		minor,
		patch,
	});
	addProtocolObjects(protocolVersionFile.serialize());

	const nodeInfoFiles = new Map<number, NodeInfoFileV1>();
	const routeCacheFiles = new Map<number, RouteCacheFileV1>();
	const nodeInfoExists = new Set<number>();
	const appRouteLock = new Set<number>();
	const routeSlaveSUC = new Set<number>();
	const sucPendingUpdate = new Set<number>();
	const isVirtual = new Set<number>();
	const pendingDiscovery = new Set<number>();
	const routeCacheExists = new Set<number>();

	for (const [id, node] of Object.entries(target.nodes)) {
		const nodeId = parseInt(id);
		if (!nodeHasInfo(node)) {
			isVirtual.add(nodeId);
			continue;
		} else {
			nodeInfoExists.add(nodeId);
			if (node.isVirtual) isVirtual.add(nodeId);
			if (node.appRouteLock) appRouteLock.add(nodeId);
			if (node.routeSlaveSUC) routeSlaveSUC.add(nodeId);
			if (node.sucPendingUpdate) sucPendingUpdate.add(nodeId);
			if (node.pendingDiscovery) pendingDiscovery.add(nodeId);
		}

		// Create/update node info file
		const nodeInfoFileIndex = nodeIdToNodeInfoFileIDV1(nodeId);
		if (!nodeInfoFiles.has(nodeInfoFileIndex)) {
			nodeInfoFiles.set(
				nodeInfoFileIndex,
				new NodeInfoFileV1({
					nodeInfos: [],
				}),
			);
		}
		const nodeInfoFile = nodeInfoFiles.get(nodeInfoFileIndex)!;

		nodeInfoFile.nodeInfos.push(nvmJSONNodeToNodeInfo(nodeId, node));

		// Create/update route cache file (if there is a route)
		if (node.lwr || node.nlwr) {
			routeCacheExists.add(nodeId);
			const routeCacheFileIndex = nodeIdToRouteCacheFileIDV1(nodeId);
			if (!routeCacheFiles.has(routeCacheFileIndex)) {
				routeCacheFiles.set(
					routeCacheFileIndex,
					new RouteCacheFileV1({
						routeCaches: [],
					}),
				);
			}
			const routeCacheFile = routeCacheFiles.get(routeCacheFileIndex)!;
			routeCacheFile.routeCaches.push({
				nodeId,
				lwr: node.lwr ?? getEmptyRoute(),
				nlwr: node.nlwr ?? getEmptyRoute(),
			});
		}
	}
	if (nodeInfoFiles.size > 0) {
		addProtocolObjects(
			...[...nodeInfoFiles.values()].map((f) => f.serialize()),
		);
	}
	if (routeCacheFiles.size > 0) {
		addProtocolObjects(
			...[...routeCacheFiles.values()].map((f) => f.serialize()),
		);
	}

	// TODO: { .key = FILE_ID_PREFERREDREPEATERS, .size = FILE_SIZE_PREFERREDREPEATERS, .name = "PREFERREDREPEATERS", .optional = true},

	addProtocolObjects(
		new SUCUpdateEntriesFile({
			updateEntries: target.controller.sucUpdateEntries,
		}).serialize(),
	);

	addProtocolObjects(
		new ControllerInfoFile(
			nvmJSONControllerToFileOptions(target.controller),
		).serialize(),
	);

	addProtocolObjects(
		new ProtocolNodeListFile({ nodeIds: [...nodeInfoExists] }).serialize(),
	);
	addProtocolObjects(
		new ProtocolRouteCacheExistsNodeMaskFile({
			nodeIds: [...routeCacheExists],
		}).serialize(),
	);

	// TODO: { .key = FILE_ID_LRANGE_NODE_EXIST, .size = FILE_SIZE_LRANGE_NODE_EXIST, .name = "LRANGE_NODE_EXIST"},

	addProtocolObjects(
		new ProtocolAppRouteLockNodeMaskFile({
			nodeIds: [...appRouteLock],
		}).serialize(),
	);
	addProtocolObjects(
		new ProtocolRouteSlaveSUCNodeMaskFile({
			nodeIds: [...routeSlaveSUC],
		}).serialize(),
	);
	addProtocolObjects(
		new ProtocolSUCPendingUpdateNodeMaskFile({
			nodeIds: [...sucPendingUpdate],
		}).serialize(),
	);
	addProtocolObjects(
		new ProtocolVirtualNodeMaskFile({
			nodeIds: [...isVirtual],
		}).serialize(),
	);
	addProtocolObjects(
		new ProtocolPendingDiscoveryNodeMaskFile({
			nodeIds: [...pendingDiscovery],
		}).serialize(),
	);

	return {
		applicationObjects,
		protocolObjects,
	};
}
