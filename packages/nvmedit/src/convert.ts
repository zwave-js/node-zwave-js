import {
	CommandClasses,
	NodeProtocolInfo,
	NodeType,
	stripUndefined,
} from "@zwave-js/core";
import { cloneDeep, pick } from "@zwave-js/shared";
import semver from "semver";
import {
	ApplicationCCsFile,
	ApplicationCCsFileID,
	ApplicationDataFile,
	ApplicationDataFileID,
	ApplicationRFConfigFile,
	ApplicationRFConfigFileID,
	ApplicationTypeFile,
	ApplicationTypeFileID,
	ApplicationVersionFile,
	ApplicationVersionFileID,
	ControllerInfoFile,
	ControllerInfoFileID,
	ControllerInfoFileOptions,
	getEmptyRoute,
	nodeIdToNodeInfoFileIDV0,
	nodeIdToNodeInfoFileIDV1,
	nodeIdToRouteCacheFileIDV0,
	nodeIdToRouteCacheFileIDV1,
	NodeInfo,
	NodeInfoFileV0,
	NodeInfoFileV1,
	NVMFile,
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
	ProtocolVersionFile,
	ProtocolVersionFileID,
	ProtocolVirtualNodeMaskFile,
	ProtocolVirtualNodeMaskFileID,
	Route,
	RouteCache,
	RouteCacheFileV0,
	RouteCacheFileV1,
	SUCUpdateEntriesFile,
	SUCUpdateEntriesFileID,
	SUCUpdateEntry,
} from "./files";
import {
	encodeNVM,
	getNVMMeta,
	NVM3Objects,
	NVMMeta,
	parseNVM,
} from "./nvm3/nvm";
import type { NVM3Object } from "./nvm3/object";
import { mapToObject } from "./nvm3/utils";

export interface NVMJSON {
	format: number;
	meta?: NVMMeta;
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
	applicationObjects: ReadonlyMap<number, NVM3Object>,
	protocolObjects: ReadonlyMap<number, NVM3Object>,
): NVMJSON {
	const nodes = new Map<number, NVMJSONNode>();
	const getNode = (id: number): NVMJSONNode => {
		if (!nodes.has(id)) nodes.set(id, createEmptyPhysicalNode());
		return nodes.get(id)!;
	};

	const getObject = (
		id: number | ((id: number) => boolean),
	): NVM3Object | undefined => {
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
	): NVM3Object => {
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

function serializeCommonApplicationObjects(nvm: NVMJSON): NVM3Object[] {
	const ret: NVM3Object[] = [];
	const applTypeFile = new ApplicationTypeFile(
		pick(nvm.controller, [
			"listening",
			"optionalFunctionality",
			"genericDeviceClass",
			"specificDeviceClass",
		]),
	);
	ret.push(applTypeFile.serialize());

	const applCCsFile = new ApplicationCCsFile(
		pick(nvm.controller.commandClasses, [
			"includedInsecurely",
			"includedSecurelyInsecureCCs",
			"includedSecurelySecureCCs",
		]),
	);
	ret.push(applCCsFile.serialize());

	if (nvm.controller.rfConfig) {
		const applRFConfigFile = new ApplicationRFConfigFile({
			...pick(nvm.controller.rfConfig, [
				"rfRegion",
				"txPower",
				"measured0dBm",
			]),
			enablePTI: nvm.controller.rfConfig.enablePTI ?? undefined,
			maxTXPower: nvm.controller.rfConfig.maxTXPower ?? undefined,
		});
		ret.push(applRFConfigFile.serialize());
	}

	if (nvm.controller.applicationData) {
		// TODO: ensure this is 512 bytes long
		const applDataFile = new ApplicationDataFile({
			data: Buffer.from(nvm.controller.applicationData, "hex"),
		});
		ret.push(applDataFile.serialize());
	}

	return ret;
}

function serializeCommonProtocolObjects(nvm: NVMJSON): NVM3Object[] {
	const ret: NVM3Object[] = [];

	const appRouteLock = new Set<number>();
	const routeSlaveSUC = new Set<number>();
	const sucPendingUpdate = new Set<number>();
	const isVirtual = new Set<number>();
	const pendingDiscovery = new Set<number>();

	for (const [id, node] of Object.entries(nvm.nodes)) {
		const nodeId = parseInt(id);
		if (!nodeHasInfo(node)) {
			isVirtual.add(nodeId);
			continue;
		} else {
			if (node.isVirtual) isVirtual.add(nodeId);
			if (node.appRouteLock) appRouteLock.add(nodeId);
			if (node.routeSlaveSUC) routeSlaveSUC.add(nodeId);
			if (node.sucPendingUpdate) sucPendingUpdate.add(nodeId);
			if (node.pendingDiscovery) pendingDiscovery.add(nodeId);
		}
	}

	ret.push(
		new ControllerInfoFile(
			nvmJSONControllerToFileOptions(nvm.controller),
		).serialize(),
	);

	ret.push(
		new ProtocolAppRouteLockNodeMaskFile({
			nodeIds: [...appRouteLock],
		}).serialize(),
	);
	ret.push(
		new ProtocolRouteSlaveSUCNodeMaskFile({
			nodeIds: [...routeSlaveSUC],
		}).serialize(),
	);
	ret.push(
		new ProtocolSUCPendingUpdateNodeMaskFile({
			nodeIds: [...sucPendingUpdate],
		}).serialize(),
	);
	ret.push(
		new ProtocolVirtualNodeMaskFile({
			nodeIds: [...isVirtual],
		}).serialize(),
	);
	ret.push(
		new ProtocolPendingDiscoveryNodeMaskFile({
			nodeIds: [...pendingDiscovery],
		}).serialize(),
	);

	// TODO: format >= 2: { .key = FILE_ID_LRANGE_NODE_EXIST, .size = FILE_SIZE_LRANGE_NODE_EXIST, .name = "LRANGE_NODE_EXIST"},

	// TODO: { .key = FILE_ID_PREFERREDREPEATERS, .size = FILE_SIZE_PREFERREDREPEATERS, .name = "PREFERREDREPEATERS", .optional = true},

	ret.push(
		new SUCUpdateEntriesFile({
			updateEntries: nvm.controller.sucUpdateEntries,
		}).serialize(),
	);

	return ret;
}

export function jsonToNVMObjects_v0(
	json: NVMJSON,
	major: number,
	minor: number,
	patch: number,
): NVM3Objects {
	const target = cloneDeep(json);
	target.format = 0;

	const applicationObjects = new Map<number, NVM3Object>();
	const protocolObjects = new Map<number, NVM3Object>();

	const addApplicationObjects = (...objects: NVM3Object[]) => {
		for (const o of objects) {
			applicationObjects.set(o.key, o);
		}
	};
	const addProtocolObjects = (...objects: NVM3Object[]) => {
		for (const o of objects) {
			protocolObjects.set(o.key, o);
		}
	};

	// Application files
	const [applMajor, applMinor, applPatch] =
		target.controller.applicationVersion.split(".").map((i) => parseInt(i));
	const applVersionFile = new ApplicationVersionFile({
		format: target.format,
		major: applMajor,
		minor: applMinor,
		patch: applPatch,
	});
	addApplicationObjects(applVersionFile.serialize());

	addApplicationObjects(...serializeCommonApplicationObjects(target));

	// Protocol files

	const protocolVersionFile = new ProtocolVersionFile({
		format: target.format,
		major,
		minor,
		patch,
	});
	addProtocolObjects(protocolVersionFile.serialize());

	const nodeInfoFiles = new Map<number, NodeInfoFileV0>();
	const routeCacheFiles = new Map<number, RouteCacheFileV0>();
	const nodeInfoExists = new Set<number>();
	const routeCacheExists = new Set<number>();

	for (const [id, node] of Object.entries(target.nodes)) {
		const nodeId = parseInt(id);
		if (!nodeHasInfo(node)) continue;

		nodeInfoExists.add(nodeId);

		// Create/update node info file
		const nodeInfoFileIndex = nodeIdToNodeInfoFileIDV0(nodeId);
		nodeInfoFiles.set(
			nodeInfoFileIndex,
			new NodeInfoFileV0({
				nodeInfo: nvmJSONNodeToNodeInfo(nodeId, node),
			}),
		);

		// Create/update route cache file (if there is a route)
		if (node.lwr || node.nlwr) {
			routeCacheExists.add(nodeId);

			const routeCacheFileIndex = nodeIdToRouteCacheFileIDV0(nodeId);
			routeCacheFiles.set(
				routeCacheFileIndex,
				new RouteCacheFileV0({
					routeCache: {
						nodeId,
						lwr: node.lwr ?? getEmptyRoute(),
						nlwr: node.nlwr ?? getEmptyRoute(),
					},
				}),
			);
		}
	}

	addProtocolObjects(...serializeCommonProtocolObjects(target));

	addProtocolObjects(
		new ProtocolNodeListFile({ nodeIds: [...nodeInfoExists] }).serialize(),
	);
	addProtocolObjects(
		new ProtocolRouteCacheExistsNodeMaskFile({
			nodeIds: [...routeCacheExists],
		}).serialize(),
	);

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

	return {
		applicationObjects,
		protocolObjects,
	};
}

export function jsonToNVMObjects_v1_to_v3(
	format: 1 | 2 | 3,
	json: NVMJSON,
	major: number,
	minor: number,
	patch: number,
): NVM3Objects {
	const target = cloneDeep(json);
	target.format = format;

	const applicationObjects = new Map<number, NVM3Object>();
	const protocolObjects = new Map<number, NVM3Object>();

	const addApplicationObjects = (...objects: NVM3Object[]) => {
		for (const o of objects) {
			applicationObjects.set(o.key, o);
		}
	};
	const addProtocolObjects = (...objects: NVM3Object[]) => {
		for (const o of objects) {
			protocolObjects.set(o.key, o);
		}
	};

	// Application files
	const [applMajor, applMinor, applPatch] =
		target.controller.applicationVersion.split(".").map((i) => parseInt(i));
	const applVersionFile = new ApplicationVersionFile({
		format: target.format,
		major: applMajor,
		minor: applMinor,
		patch: applPatch,
	});
	addApplicationObjects(applVersionFile.serialize());

	addApplicationObjects(...serializeCommonApplicationObjects(target));

	// Protocol files

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
	const routeCacheExists = new Set<number>();

	for (const [id, node] of Object.entries(target.nodes)) {
		const nodeId = parseInt(id);
		if (!nodeHasInfo(node)) continue;

		nodeInfoExists.add(nodeId);

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

	addProtocolObjects(...serializeCommonProtocolObjects(target));

	addProtocolObjects(
		new ProtocolNodeListFile({ nodeIds: [...nodeInfoExists] }).serialize(),
	);
	addProtocolObjects(
		new ProtocolRouteCacheExistsNodeMaskFile({
			nodeIds: [...routeCacheExists],
		}).serialize(),
	);

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

	return {
		applicationObjects,
		protocolObjects,
	};
}

/** Reads an NVM buffer and returns its JSON representation */
export function nvmToJSON(
	buffer: Buffer,
	debugLogs: boolean = false,
): Required<NVMJSON> {
	const nvm = parseNVM(buffer, debugLogs);
	const ret = nvmObjectsToJSON(nvm.applicationObjects, nvm.protocolObjects);
	ret.meta = getNVMMeta(nvm.protocolPages[0]);
	return ret as Required<NVMJSON>;
}

/** Takes a JSON represented NVM and converts it to binary */
export function jsonToNVM(
	json: Required<NVMJSON>,
	protocolVersion: string,
): Buffer {
	const parsedVersion = semver.parse(protocolVersion);
	if (!parsedVersion) {
		throw new Error(`Invalid protocol version: ${protocolVersion}`);
	}

	let objects: NVM3Objects;
	if (semver.gte(parsedVersion, "7.15.3")) {
		objects = jsonToNVMObjects_v1_to_v3(
			3,
			json,
			parsedVersion.major,
			parsedVersion.minor,
			parsedVersion.patch,
		);
	} else if (semver.gte(parsedVersion, "7.12.0")) {
		objects = jsonToNVMObjects_v1_to_v3(
			2,
			json,
			parsedVersion.major,
			parsedVersion.minor,
			parsedVersion.patch,
		);
	} else if (semver.gte(parsedVersion, "7.11.0")) {
		objects = jsonToNVMObjects_v1_to_v3(
			1,
			json,
			parsedVersion.major,
			parsedVersion.minor,
			parsedVersion.patch,
		);
	} else if (semver.gte(parsedVersion, "7.0.0")) {
		objects = jsonToNVMObjects_v0(
			json,
			parsedVersion.major,
			parsedVersion.minor,
			parsedVersion.patch,
		);
	} else {
		throw new Error("cannot convert to a pre-7.0 NVM version");
	}

	return encodeNVM(
		objects.applicationObjects,
		objects.protocolObjects,
		json.meta,
	);
}
