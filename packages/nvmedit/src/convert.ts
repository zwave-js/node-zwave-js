import {
	CommandClasses,
	ControllerCapabilityFlags,
	isZWaveError,
	NodeProtocolInfo,
	NodeType,
	RFRegion,
	stripUndefined,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import { cloneDeep, pick } from "@zwave-js/shared/safe";
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
	ProtocolPreferredRepeatersFile,
	ProtocolPreferredRepeatersFileID,
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
import {
	createParser as createNVM500Parser,
	nmvDetails500,
	NVM500JSON,
	NVMSerializer,
} from "./nvm500/NVMParser";

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
	preferredRepeaters?: number[] | null;

	isListening: boolean;
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
	rfRegion: RFRegion;
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

type ParsedNVM =
	| {
			type: 500;
			json: Required<NVM500JSON>;
	  }
	| {
			type: 700;
			json: Required<NVMJSON>;
	  }
	| {
			type: "unknown";
	  };

export function nodeHasInfo(node: NVMJSONNode): node is NVMJSONNodeWithInfo {
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
		nodeType: NodeType["End Node"],
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
		throw new ZWaveError(
			`Object${typeof id === "number" ? ` ${id}` : ""} not found!`,
			ZWaveErrorCodes.NVM_ObjectNotFound,
		);
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
			} else if (protocolFileFormat <= 4) {
				const fileId = nodeIdToNodeInfoFileIDV1(id);
				const file = getFileOrThrow<NodeInfoFileV1>(fileId);
				nodeInfo = file.nodeInfos.find((i) => i.nodeId === id)!;
			} else {
				throw new ZWaveError(
					`Unsupported protocol file format: ${protocolFileFormat}`,
					ZWaveErrorCodes.NVM_NotSupported,
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
			let routeCache: RouteCache | undefined;
			if (protocolFileFormat === 0) {
				const fileId = nodeIdToRouteCacheFileIDV0(id);
				const file = getFile<RouteCacheFileV0>(fileId);
				routeCache = file?.routeCache;
			} else if (protocolFileFormat <= 4) {
				const fileId = nodeIdToRouteCacheFileIDV1(id);
				const file = getFile<RouteCacheFileV1>(fileId);
				routeCache = file?.routeCaches.find((i) => i.nodeId === id);
			} else {
				throw new ZWaveError(
					`Unsupported protocol file format: ${protocolFileFormat}`,
					ZWaveErrorCodes.NVM_NotSupported,
				);
			}
			if (routeCache) {
				node.lwr = routeCache.lwr;
				node.nlwr = routeCache.nlwr;
			}
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
	const preferredRepeaters = getFile<ProtocolPreferredRepeatersFile>(
		ProtocolPreferredRepeatersFileID,
	)?.nodeIds;

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
			"isListening",
			"optionalFunctionality",
			"genericDeviceClass",
			"specificDeviceClass",
		]),
		commandClasses: pick(applicationCCsFile, [
			"includedInsecurely",
			"includedSecurelyInsecureCCs",
			"includedSecurelySecureCCs",
		]),
		preferredRepeaters,
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
		"preferredRepeaters",
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
			"isListening",
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

	if (nvm.controller.preferredRepeaters?.length) {
		ret.push(
			new ProtocolPreferredRepeatersFile({
				nodeIds: nvm.controller.preferredRepeaters,
			}).serialize(),
		);
	}

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

export function jsonToNVMObjects_v1_to_v4(
	format: 1 | 2 | 3 | 4,
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

	// When converting it can be that the rfConfig doesn't exist. Make sure
	// that it is initialized with proper defaults.
	target.controller.rfConfig ??= {
		rfRegion: RFRegion["Default (EU)"],
		txPower: 0.0,
		measured0dBm: +3.3,
		enablePTI: null,
		maxTXPower: null,
	};

	// For v3+ targets, the enablePTI and maxTxPower must be set in the rfConfig
	// or the controller will ignore the file and not accept any changes to the RF config
	if (format >= 3) {
		target.controller.rfConfig.enablePTI ??= 0;
		target.controller.rfConfig.maxTXPower ??= 14.0;
	}

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

	// For v3+ targets, the ControllerInfoFile must contain the LongRange properties
	// or the controller will ignore the file and not have a home ID
	if (format >= 3) {
		target.controller.lastNodeIdLR ??= 255;
		target.controller.maxNodeIdLR ??= 0;
		target.controller.reservedIdLR ??= 0;
		target.controller.primaryLongRangeChannelId ??= 0;
		target.controller.dcdcConfig ??= 255;
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

/** Reads an NVM buffer of a 500-series stick and returns its JSON representation */
export function nvm500ToJSON(buffer: Buffer): Required<NVM500JSON> {
	const parser = createNVM500Parser(buffer);
	if (!parser)
		throw new ZWaveError(
			"Did not find a matching NVM 500 parser implementation! Make sure that the NVM data belongs to a controller with Z-Wave SDK 6.61 or higher.",
			ZWaveErrorCodes.NVM_NotSupported,
		);
	return parser.toJSON();
}

/** Takes a JSON represented NVM and converts it to binary */
export function jsonToNVM(
	json: Required<NVMJSON>,
	protocolVersion: string,
): Buffer {
	const parsedVersion = semver.parse(protocolVersion);
	if (!parsedVersion) {
		throw new ZWaveError(
			`Invalid protocol version: ${protocolVersion}`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	let objects: NVM3Objects;
	if (semver.gte(parsedVersion, "7.17.0")) {
		objects = jsonToNVMObjects_v1_to_v4(
			4,
			json,
			parsedVersion.major,
			parsedVersion.minor,
			parsedVersion.patch,
		);
	} else if (semver.gte(parsedVersion, "7.15.3")) {
		objects = jsonToNVMObjects_v1_to_v4(
			3,
			json,
			parsedVersion.major,
			parsedVersion.minor,
			parsedVersion.patch,
		);
	} else if (semver.gte(parsedVersion, "7.12.0")) {
		objects = jsonToNVMObjects_v1_to_v4(
			2,
			json,
			parsedVersion.major,
			parsedVersion.minor,
			parsedVersion.patch,
		);
	} else if (semver.gte(parsedVersion, "7.11.0")) {
		objects = jsonToNVMObjects_v1_to_v4(
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
		throw new ZWaveError(
			"jsonToNVM cannot convert to a pre-7.0 NVM version. Use jsonToNVM500 instead.",
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	return encodeNVM(
		objects.applicationObjects,
		objects.protocolObjects,
		json.meta,
	);
}

/** Takes a JSON represented 500 series NVM and converts it to binary */
export function jsonToNVM500(
	json: Required<NVM500JSON>,
	protocolVersion: string,
): Buffer {
	// Try to find a matching implementation
	const impl = nmvDetails500.find(
		(p) =>
			p.protocolVersions.includes(protocolVersion) &&
			p.name.toLowerCase().startsWith(json.meta.library),
	);

	if (!impl) {
		throw new ZWaveError(
			`Did not find a matching implementation for protocol version ${protocolVersion} and library ${json.meta.library}. To convert 500-series NVMs, both the source and the target controller must be using Z-Wave SDK 6.61 or higher.`,
			ZWaveErrorCodes.NVM_NotSupported,
		);
	}

	const serializer = new NVMSerializer(impl);
	serializer.parseJSON(json, protocolVersion);
	return serializer.serialize();
}

export function json500To700(
	json: NVM500JSON,
	truncateApplicationData?: boolean,
): NVMJSON {
	const source = cloneDeep(json);

	// On the 500 series, some properties are only defined for the nodes, so we pull it off the
	// controller's node entry
	let controllerNode = source.nodes[
		source.controller.nodeId || 1
	] as NVMJSONNodeWithInfo; // Little hack because TS doesn't type check the union type properly
	if (!nodeHasInfo(controllerNode)) {
		// No information available, use sensible defaults
		controllerNode = {
			isListening: true,
			optionalFunctionality: false,
			// Static PC Controller
			genericDeviceClass: 0x02,
			specificDeviceClass: 0x01,
		} as any;
	}

	let applicationData: string | null = null;
	if (source.controller.applicationData) {
		let raw = Buffer.from(source.controller.applicationData, "hex");
		// Find actual start and end of application data, ignoring zeroes
		let start = 0;
		while (start < raw.length && raw[start] === 0) {
			start++;
		}
		let end = raw.length - 1;
		while (end > start && raw[end] === 0) {
			end--;
		}
		raw = raw.slice(start, end + 1);
		if (raw.length > 512) {
			if (!truncateApplicationData) {
				throw new ZWaveError(
					"Invalid NVM JSON: Application data would be truncated! Set truncateApplicationData to true to allow this.",
					ZWaveErrorCodes.NVM_InvalidJSON,
				);
			}
			raw = raw.slice(0, 512);
		}
		applicationData = raw.toString("hex");
	}

	let homeId: string;
	if (
		source.controller.controllerConfiguration &
		ControllerCapabilityFlags.OnOtherNetwork
	) {
		// The controller did not start the network itself
		if (!source.controller.learnedHomeId) {
			throw new ZWaveError(
				"Invalid NVM JSON: Controller is part of another network but has no learned Home ID!",
				ZWaveErrorCodes.NVM_InvalidJSON,
			);
		} else if (!source.controller.nodeId) {
			throw new ZWaveError(
				"Invalid NVM JSON: Controller is part of another network but node ID is zero!",
				ZWaveErrorCodes.NVM_InvalidJSON,
			);
		}
		homeId = source.controller.learnedHomeId;
	} else {
		// The controller did start the network itself
		homeId = source.controller.ownHomeId;
		// it is safe to set the node ID to 1
		source.controller.nodeId = 1;
	}

	const ret: NVMJSON = {
		// Start out with format 0 (= protocol version 7.0.0), the jsonToNVM routines will do further conversion
		format: 0,
		controller: {
			// This will contain the original 6.x protocol version, but the jsonToNVM routines will update it
			protocolVersion: source.controller.protocolVersion,
			applicationVersion: source.controller.applicationVersion,
			homeId,
			nodeId: source.controller.nodeId,
			lastNodeId: source.controller.lastNodeId,
			staticControllerNodeId: source.controller.staticControllerNodeId,
			sucLastIndex: source.controller.sucLastIndex,
			controllerConfiguration: source.controller.controllerConfiguration,
			sucUpdateEntries: source.controller.sucUpdateEntries,
			maxNodeId: source.controller.maxNodeId,
			reservedId: source.controller.reservedId,
			systemState: source.controller.systemState,
			preferredRepeaters: source.controller.preferredRepeaters,

			// RF config exists on both series but isn't compatible

			isListening: controllerNode.isListening,
			optionalFunctionality: controllerNode.optionalFunctionality,
			genericDeviceClass: controllerNode.genericDeviceClass,
			specificDeviceClass: controllerNode.specificDeviceClass ?? 0,

			commandClasses: {
				includedInsecurely: source.controller.commandClasses,
				includedSecurelyInsecureCCs: [],
				includedSecurelySecureCCs: [],
			},

			applicationData,
		},
		// The node entries are actually compatible between the two JSON versions
		// but the types are structured differently
		nodes: source.nodes,
	};
	return ret;
}

export function json700To500(json: NVMJSON): NVM500JSON {
	const source = cloneDeep(json);

	let ownHomeId: string;
	let learnedHomeId: string | null = null;
	let nodeId: number;
	if (
		source.controller.controllerConfiguration &
		ControllerCapabilityFlags.OnOtherNetwork
	) {
		// The controller did not start the network itself
		ownHomeId = learnedHomeId = source.controller.homeId;
		nodeId = source.controller.nodeId;
	} else {
		// The controller did start the network itself
		ownHomeId = source.controller.homeId;
		// 500 series controllers expect the node ID to be 0 when they are the primary
		nodeId = 0;
	}

	const ret: NVM500JSON = {
		format: 500,
		controller: {
			// This will contain the original 7.x protocol version, but the jsonToNVM routines will update it
			protocolVersion: source.controller.protocolVersion,
			applicationVersion: source.controller.applicationVersion,
			// The 700 series does not distinguish between own and learned home ID in NVM
			// We infer it from the controller configuration if we need it
			ownHomeId,
			learnedHomeId,
			nodeId,
			lastNodeId: source.controller.lastNodeId,
			staticControllerNodeId: source.controller.staticControllerNodeId,
			sucLastIndex: source.controller.sucLastIndex,
			controllerConfiguration: source.controller.controllerConfiguration,
			sucUpdateEntries: source.controller.sucUpdateEntries,
			maxNodeId: source.controller.maxNodeId,
			reservedId: source.controller.reservedId,
			systemState: source.controller.systemState,
			watchdogStarted: 0,
			preferredRepeaters: json.controller.preferredRepeaters ?? [],

			// RF config exists on both series but isn't compatible. So set the default,
			// it will be taken from the target NVM on restore.
			rfConfig: {
				powerLevelNormal: [255, 255, 255],
				powerLevelLow: [255, 255, 255],
				powerMode: 255,
				powerModeExtintEnable: 255,
				powerModeWutTimeout: 0xffffffff,
			},

			commandClasses: source.controller.commandClasses.includedInsecurely,

			applicationData: source.controller.applicationData,
		},
		// The node entries are actually compatible between the two JSON versions
		// just the types are structured differently
		nodes: source.nodes,
	};
	return ret;
}

/** Converts the given source NVM into a format that is compatible with the given target NVM */
export function migrateNVM(sourceNVM: Buffer, targetNVM: Buffer): Buffer {
	let source: ParsedNVM;
	let target: ParsedNVM;
	try {
		source = {
			type: 700,
			json: nvmToJSON(sourceNVM),
		};
	} catch (e) {
		if (isZWaveError(e) && e.code === ZWaveErrorCodes.NVM_InvalidFormat) {
			// This is not a 700 series NVM, maybe it is a 500 series one?
			source = {
				type: 500,
				json: nvm500ToJSON(sourceNVM),
			};
		} else {
			source = { type: "unknown" };
		}
	}

	try {
		target = {
			type: 700,
			json: nvmToJSON(targetNVM),
		};
	} catch (e) {
		if (isZWaveError(e) && e.code === ZWaveErrorCodes.NVM_InvalidFormat) {
			// This is not a 700 series NVM, maybe it is a 500 series one?
			target = {
				type: 500,
				json: nvm500ToJSON(targetNVM),
			};
		} else {
			target = { type: "unknown" };
		}
	}

	// Short circuit if...
	if (source.type === 700 && target.type === 700) {
		//... the source and target protocol versions are compatible without conversion
		const sourceProtocolVersion = source.json.controller.protocolVersion;
		const targetProtocolVersion = target.json.controller.protocolVersion;

		// The 700 series firmware can automatically upgrade backups from a previous protocol version
		// Not sure when that ability was added. To be on the safe side, allow it for 7.16+ which definitely supports it.
		if (
			semver.gte(targetProtocolVersion, "7.16.0") &&
			semver.gte(targetProtocolVersion, sourceProtocolVersion)
		) {
			return sourceNVM;
		}
	} else if (source.type === "unknown" && target.type !== "unknown") {
		// ...only the source has an unsupported format, so we have to convert but can't
		throw new ZWaveError(
			`The source NVM has an unsupported format, which cannot be restored on a ${target.type}-series NVM!`,
			ZWaveErrorCodes.NVM_NotSupported,
		);
	} else if (source.type !== "unknown" && target.type === "unknown") {
		// ...only the target has an unsupported format, so we have to convert but can't
		throw new ZWaveError(
			`The target NVM has an unsupported format, cannot restore ${source.type}-series NVM onto it!`,
			ZWaveErrorCodes.NVM_NotSupported,
		);
	} else if (source.type === "unknown" && target.type === "unknown") {
		// ...both are an unsupported format, meaning pre-6.61 SDK, which we cannot convert
		return sourceNVM;
	}

	// TypeScript doesn't understand multi-variable narrowings (yet)
	source = source as Exclude<ParsedNVM, { type: "unknown" }>;
	target = target as Exclude<ParsedNVM, { type: "unknown" }>;

	// In any case, preserve the application version of the target stick
	source.json.controller.applicationVersion =
		target.json.controller.applicationVersion;

	if (source.type === 500 && target.type === 500) {
		// Both are 500, so we just need to update the metadata to match the target
		const json: Required<NVM500JSON> = {
			...source.json,
			meta: target.json.meta,
		};
		// If the target is a 500 series stick, preserve the RF config
		json.controller.rfConfig = target.json.controller.rfConfig;
		return jsonToNVM500(json, target.json.controller.protocolVersion);
	} else if (source.type === 500 && target.type === 700) {
		// We need to upgrade the source to 700 series
		const json: Required<NVMJSON> = {
			...json500To700(source.json, true),
			meta: target.json.meta,
		};
		// The target is a different series, try to preserve the RF config of the target stick
		json.controller.rfConfig = target.json.controller.rfConfig;
		return jsonToNVM(json, target.json.controller.protocolVersion);
	} else if (source.type === 700 && target.type === 500) {
		// We need to downgrade the source to 500 series
		const json: Required<NVM500JSON> = {
			...json700To500(source.json),
			meta: target.json.meta,
		};
		// The target is a different series, try to preserve the RF config of the target stick
		json.controller.rfConfig = target.json.controller.rfConfig;
		return jsonToNVM500(json, target.json.controller.protocolVersion);
	} else {
		// Both are 700, so we just need to update the metadata to match the target
		const json: Required<NVMJSON> = {
			...(source.json as Required<NVMJSON>),
			meta: (target.json as Required<NVMJSON>).meta,
		};
		return jsonToNVM(json, target.json.controller.protocolVersion);
	}
}
