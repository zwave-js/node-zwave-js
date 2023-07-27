import {
	ControllerCapabilityFlags,
	NodeType,
	RFRegion,
	ZWaveError,
	ZWaveErrorCodes,
	isZWaveError,
	stripUndefined,
	type CommandClasses,
	type NodeProtocolInfo,
} from "@zwave-js/core/safe";
import { cloneDeep, pick } from "@zwave-js/shared/safe";
import { isObject } from "alcalzone-shared/typeguards";
import semver from "semver";
import { MAX_PROTOCOL_FILE_FORMAT, SUC_MAX_UPDATES } from "./consts";
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
	NVMFile,
	NodeInfoFileV0,
	NodeInfoFileV1,
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
	RouteCacheFileV0,
	RouteCacheFileV1,
	SUCUpdateEntriesFileIDV0,
	SUCUpdateEntriesFileV0,
	SUCUpdateEntriesFileV5,
	SUC_UPDATES_PER_FILE_V5,
	getEmptyRoute,
	nodeIdToNodeInfoFileIDV0,
	nodeIdToNodeInfoFileIDV1,
	nodeIdToRouteCacheFileIDV0,
	nodeIdToRouteCacheFileIDV1,
	sucUpdateIndexToSUCUpdateEntriesFileIDV5,
	type ControllerInfoFileOptions,
	type NodeInfo,
	type Route,
	type RouteCache,
	type SUCUpdateEntry,
} from "./files";
import {
	encodeNVM,
	getNVMMeta,
	parseNVM,
	type NVM3Objects,
	type NVMMeta,
} from "./nvm3/nvm";
import type { NVM3Object } from "./nvm3/object";
import { mapToObject } from "./nvm3/utils";
import {
	NVMSerializer,
	createParser as createNVM500Parser,
	nmvDetails500,
	type NVM500JSON,
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
		fileVersion: string,
	): T => {
		const obj = getObjectOrThrow(id);
		return NVMFile.from(obj, fileVersion) as T;
	};

	const getFile = <T extends NVMFile>(
		id: number | ((id: number) => boolean),
		fileVersion: string,
	): T | undefined => {
		const obj = getObject(id);
		if (!obj) return undefined;
		return NVMFile.from(obj, fileVersion) as T;
	};

	// === Protocol NVM files ===

	// Figure out how to parse the individual files
	const protocolVersionFile = getFileOrThrow<ProtocolVersionFile>(
		ProtocolVersionFileID,
		"7.0.0", // We don't know the version here yet
	);
	const protocolFileFormat = protocolVersionFile.format;
	const protocolVersion = `${protocolVersionFile.major}.${protocolVersionFile.minor}.${protocolVersionFile.patch}`;

	// Bail early if the NVM uses a protocol file format that's newer than we support
	if (protocolFileFormat > MAX_PROTOCOL_FILE_FORMAT) {
		throw new ZWaveError(
			`Unsupported protocol file format: ${protocolFileFormat}`,
			ZWaveErrorCodes.NVM_NotSupported,
			{ protocolFileFormat },
		);
	}

	// Figure out which nodes exist
	const nodeIds = getFileOrThrow<ProtocolNodeListFile>(
		ProtocolNodeListFileID,
		protocolVersion,
	).nodeIds;

	// Read all flags for all nodes
	const appRouteLock = new Set(
		getFileOrThrow<ProtocolAppRouteLockNodeMaskFile>(
			ProtocolAppRouteLockNodeMaskFileID,
			protocolVersion,
		).nodeIds,
	);
	const routeSlaveSUC = new Set(
		getFileOrThrow<ProtocolRouteSlaveSUCNodeMaskFile>(
			ProtocolRouteSlaveSUCNodeMaskFileID,
			protocolVersion,
		).nodeIds,
	);
	const sucPendingUpdate = new Set(
		getFileOrThrow<ProtocolSUCPendingUpdateNodeMaskFile>(
			ProtocolSUCPendingUpdateNodeMaskFileID,
			protocolVersion,
		).nodeIds,
	);
	const isVirtual = new Set(
		getFileOrThrow<ProtocolVirtualNodeMaskFile>(
			ProtocolVirtualNodeMaskFileID,
			protocolVersion,
		).nodeIds,
	);
	const pendingDiscovery = new Set(
		getFileOrThrow<ProtocolPendingDiscoveryNodeMaskFile>(
			ProtocolPendingDiscoveryNodeMaskFileID,
			protocolVersion,
		).nodeIds,
	);
	const routeCacheExists = new Set(
		getFileOrThrow<ProtocolRouteCacheExistsNodeMaskFile>(
			ProtocolRouteCacheExistsNodeMaskFileID,
			protocolVersion,
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
				const file = getFileOrThrow<NodeInfoFileV0>(
					fileId,
					protocolVersion,
				);
				nodeInfo = file.nodeInfo;
			} else {
				const fileId = nodeIdToNodeInfoFileIDV1(id);
				const file = getFileOrThrow<NodeInfoFileV1>(
					fileId,
					protocolVersion,
				);
				nodeInfo = file.nodeInfos.find((i) => i.nodeId === id)!;
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
				const file = getFile<RouteCacheFileV0>(fileId, protocolVersion);
				routeCache = file?.routeCache;
			} else {
				const fileId = nodeIdToRouteCacheFileIDV1(id);
				const file = getFile<RouteCacheFileV1>(fileId, protocolVersion);
				routeCache = file?.routeCaches.find((i) => i.nodeId === id);
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
	const controllerInfoFile = getFileOrThrow<ControllerInfoFile>(
		ControllerInfoFileID,
		protocolVersion,
	);

	let sucUpdateEntries: SUCUpdateEntry[];
	if (protocolFileFormat < 5) {
		sucUpdateEntries = getFileOrThrow<SUCUpdateEntriesFileV0>(
			SUCUpdateEntriesFileIDV0,
			protocolVersion,
		).updateEntries;
	} else {
		// V5 has split the entries into multiple files
		sucUpdateEntries = [];
		for (
			let index = 0;
			index < SUC_MAX_UPDATES;
			index += SUC_UPDATES_PER_FILE_V5
		) {
			const file = getFile<SUCUpdateEntriesFileV5>(
				sucUpdateIndexToSUCUpdateEntriesFileIDV5(index),
				protocolVersion,
			);
			if (!file) break;
			sucUpdateEntries.push(...file.updateEntries);
		}
	}

	// === Application NVM files ===

	const applicationVersionFile = getFileOrThrow<ApplicationVersionFile>(
		ApplicationVersionFileID,
		"7.0.0", // We don't know the version here yet
	);
	const applicationVersion = `${applicationVersionFile.major}.${applicationVersionFile.minor}.${applicationVersionFile.patch}`;

	const rfConfigFile = getFile<ApplicationRFConfigFile>(
		ApplicationRFConfigFileID,
		applicationVersion,
	);
	const applicationCCsFile = getFileOrThrow<ApplicationCCsFile>(
		ApplicationCCsFileID,
		applicationVersion,
	);
	const applicationDataFile = getFile<ApplicationDataFile>(
		ApplicationDataFileID,
		applicationVersion,
	);
	const applicationTypeFile = getFileOrThrow<ApplicationTypeFile>(
		ApplicationTypeFileID,
		applicationVersion,
	);
	const preferredRepeaters = getFile<ProtocolPreferredRepeatersFile>(
		ProtocolPreferredRepeatersFileID,
		applicationVersion,
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
	const applTypeFile = new ApplicationTypeFile({
		...pick(nvm.controller, [
			"isListening",
			"optionalFunctionality",
			"genericDeviceClass",
			"specificDeviceClass",
		]),
		fileVersion: nvm.controller.applicationVersion,
	});
	ret.push(applTypeFile.serialize());

	const applCCsFile = new ApplicationCCsFile({
		...pick(nvm.controller.commandClasses, [
			"includedInsecurely",
			"includedSecurelyInsecureCCs",
			"includedSecurelySecureCCs",
		]),
		fileVersion: nvm.controller.applicationVersion,
	});
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
			fileVersion: nvm.controller.applicationVersion,
		});
		ret.push(applRFConfigFile.serialize());
	}

	if (nvm.controller.applicationData) {
		// TODO: ensure this is 512 bytes long
		const applDataFile = new ApplicationDataFile({
			data: Buffer.from(nvm.controller.applicationData, "hex"),
			fileVersion: nvm.controller.applicationVersion,
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
			fileVersion: nvm.controller.protocolVersion,
		}).serialize(),
	);
	ret.push(
		new ProtocolRouteSlaveSUCNodeMaskFile({
			nodeIds: [...routeSlaveSUC],
			fileVersion: nvm.controller.protocolVersion,
		}).serialize(),
	);
	ret.push(
		new ProtocolSUCPendingUpdateNodeMaskFile({
			nodeIds: [...sucPendingUpdate],
			fileVersion: nvm.controller.protocolVersion,
		}).serialize(),
	);
	ret.push(
		new ProtocolVirtualNodeMaskFile({
			nodeIds: [...isVirtual],
			fileVersion: nvm.controller.protocolVersion,
		}).serialize(),
	);
	ret.push(
		new ProtocolPendingDiscoveryNodeMaskFile({
			nodeIds: [...pendingDiscovery],
			fileVersion: nvm.controller.protocolVersion,
		}).serialize(),
	);

	// TODO: format >= 2: { .key = FILE_ID_LRANGE_NODE_EXIST, .size = FILE_SIZE_LRANGE_NODE_EXIST, .name = "LRANGE_NODE_EXIST"},

	if (nvm.controller.preferredRepeaters?.length) {
		ret.push(
			new ProtocolPreferredRepeatersFile({
				nodeIds: nvm.controller.preferredRepeaters,
				fileVersion: nvm.controller.protocolVersion,
			}).serialize(),
		);
	}

	if (nvm.format < 5) {
		ret.push(
			new SUCUpdateEntriesFileV0({
				updateEntries: nvm.controller.sucUpdateEntries,
				fileVersion: nvm.controller.protocolVersion,
			}).serialize(),
		);
	} else {
		// V5 has split the SUC update entries into multiple files
		for (
			let index = 0;
			index < SUC_MAX_UPDATES;
			index += SUC_UPDATES_PER_FILE_V5
		) {
			const slice = nvm.controller.sucUpdateEntries.slice(
				index,
				index + SUC_UPDATES_PER_FILE_V5,
			);
			if (slice.length === 0) break;
			const file = new SUCUpdateEntriesFileV5({
				updateEntries: slice,
				fileVersion: nvm.controller.protocolVersion,
			});
			file.fileId = sucUpdateIndexToSUCUpdateEntriesFileIDV5(index);
			ret.push(file.serialize());
		}
	}

	return ret;
}

export function jsonToNVMObjects_v7_0_0(
	json: NVMJSON,
	targetSDKVersion: semver.SemVer,
): NVM3Objects {
	const target = cloneDeep(json);

	target.controller.protocolVersion = "7.0.0";
	target.format = 0;
	target.controller.applicationVersion = targetSDKVersion.format();

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
	const applVersionFile = new ApplicationVersionFile({
		// The SDK compares 4-byte values where the format is set to 0 to determine whether a migration is needed
		format: 0,
		major: targetSDKVersion.major,
		minor: targetSDKVersion.minor,
		patch: targetSDKVersion.patch,
		fileVersion: target.controller.applicationVersion, // does not matter for this file
	});
	addApplicationObjects(applVersionFile.serialize());

	addApplicationObjects(...serializeCommonApplicationObjects(target));

	// Protocol files

	const protocolVersionFile = new ProtocolVersionFile({
		format: target.format,
		major: 7,
		minor: 0,
		patch: 0,
		fileVersion: target.controller.protocolVersion, // does not matter for this file
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
				fileVersion: target.controller.protocolVersion,
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
					fileVersion: target.controller.protocolVersion,
				}),
			);
		}
	}

	addProtocolObjects(...serializeCommonProtocolObjects(target));

	addProtocolObjects(
		new ProtocolNodeListFile({
			nodeIds: [...nodeInfoExists],
			fileVersion: target.controller.protocolVersion,
		}).serialize(),
	);
	addProtocolObjects(
		new ProtocolRouteCacheExistsNodeMaskFile({
			nodeIds: [...routeCacheExists],
			fileVersion: target.controller.protocolVersion,
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

export function jsonToNVMObjects_v7_11_0(
	json: NVMJSON,
	targetSDKVersion: semver.SemVer,
): NVM3Objects {
	const target = cloneDeep(json);

	let targetApplicationVersion: semver.SemVer;
	let targetProtocolVersion: semver.SemVer;
	let targetProtocolFormat: number;

	// We currently support application version migrations up to 7.19.1
	// For all higher ones, set the highest version we support and let the controller handle the migration itself
	if (semver.lte(targetSDKVersion, "7.19.1")) {
		targetApplicationVersion = semver.parse(targetSDKVersion)!;
	} else {
		targetApplicationVersion = semver.parse("7.19.1")!;
	}

	// The protocol version file only seems to be updated when the format of the protocol file system changes
	// Once again, we simply set the highest version we support here and let the controller handle any potential migration
	if (semver.gte(targetSDKVersion, "7.19.0")) {
		targetProtocolVersion = semver.parse("7.19.0")!;
		targetProtocolFormat = 5;
	} else if (semver.gte(targetSDKVersion, "7.17.0")) {
		targetProtocolVersion = semver.parse("7.17.0")!;
		targetProtocolFormat = 4;
	} else if (semver.gte(targetSDKVersion, "7.15.3")) {
		targetProtocolVersion = semver.parse("7.15.3")!;
		targetProtocolFormat = 3;
	} else if (semver.gte(targetSDKVersion, "7.12.0")) {
		targetProtocolVersion = semver.parse("7.12.0")!;
		targetProtocolFormat = 2;
	} else {
		// All versions below 7.11.0 are handled in the _v7_0_0 method
		targetProtocolVersion = semver.parse("7.11.0")!;
		targetProtocolFormat = 1;
	}

	target.format = targetProtocolFormat;
	target.controller.applicationVersion = targetApplicationVersion.format();
	target.controller.protocolVersion = targetProtocolVersion.format();

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
	const applVersionFile = new ApplicationVersionFile({
		// The SDK compares 4-byte values where the format is set to 0 to determine whether a migration is needed
		format: 0,
		major: targetApplicationVersion.major,
		minor: targetApplicationVersion.minor,
		patch: targetApplicationVersion.patch,
		fileVersion: target.controller.applicationVersion, // does not matter for this file
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

	// Make sure the RF config format matches the application version.
	// Otherwise, the controller will ignore the file and not accept any changes to the RF config
	if (semver.gte(targetSDKVersion, "7.15.3")) {
		target.controller.rfConfig.enablePTI ??= 0;
		target.controller.rfConfig.maxTXPower ??= 14.0;
	}

	addApplicationObjects(...serializeCommonApplicationObjects(target));

	// Protocol files

	const protocolVersionFile = new ProtocolVersionFile({
		format: targetProtocolFormat,
		major: targetProtocolVersion.major,
		minor: targetProtocolVersion.minor,
		patch: targetProtocolVersion.patch,
		fileVersion: target.controller.protocolVersion, // does not matter for this file
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
					fileVersion: target.controller.protocolVersion,
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
						fileVersion: target.controller.protocolVersion,
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
	if (targetProtocolFormat >= 3) {
		target.controller.lastNodeIdLR ??= 255;
		target.controller.maxNodeIdLR ??= 0;
		target.controller.reservedIdLR ??= 0;
		target.controller.primaryLongRangeChannelId ??= 0;
		target.controller.dcdcConfig ??= 255;
	}

	addProtocolObjects(...serializeCommonProtocolObjects(target));

	addProtocolObjects(
		new ProtocolNodeListFile({
			nodeIds: [...nodeInfoExists],
			fileVersion: target.controller.protocolVersion,
		}).serialize(),
	);
	addProtocolObjects(
		new ProtocolRouteCacheExistsNodeMaskFile({
			nodeIds: [...routeCacheExists],
			fileVersion: target.controller.protocolVersion,
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
	targetSDKVersion: string,
): Buffer {
	const parsedVersion = semver.parse(targetSDKVersion);
	if (!parsedVersion) {
		throw new ZWaveError(
			`Invalid SDK version: ${targetSDKVersion}`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	let objects: NVM3Objects;
	if (semver.gte(parsedVersion, "7.11.0")) {
		objects = jsonToNVMObjects_v7_11_0(json, parsedVersion);
	} else if (semver.gte(parsedVersion, "7.0.0")) {
		objects = jsonToNVMObjects_v7_0_0(json, parsedVersion);
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

	// https://github.com/zwave-js/node-zwave-js/issues/6055
	// On some controllers this byte can be 0xff (effectively not set)
	let controllerConfiguration = source.controller.controllerConfiguration;
	if (source.controller.controllerConfiguration === 0xff) {
		// Default to SUC/Primary
		controllerConfiguration =
			ControllerCapabilityFlags.SISPresent |
			ControllerCapabilityFlags.WasRealPrimary |
			ControllerCapabilityFlags.SUC;
	}

	let homeId: string;
	if (controllerConfiguration & ControllerCapabilityFlags.OnOtherNetwork) {
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

	// https://github.com/zwave-js/node-zwave-js/issues/6055
	// Some controllers have invalid information for the IDs
	let maxNodeId = source.controller.maxNodeId;
	if (maxNodeId === 0xff) maxNodeId = source.controller.lastNodeId;
	let reservedId = source.controller.reservedId;
	if (reservedId === 0xff) reservedId = 0;

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
			controllerConfiguration,
			sucUpdateEntries: source.controller.sucUpdateEntries,
			maxNodeId,
			reservedId,
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
	let sourceProtocolFileFormat: number | undefined;
	let targetProtocolFileFormat: number | undefined;

	try {
		source = {
			type: 700,
			json: nvmToJSON(sourceNVM),
		};
		sourceProtocolFileFormat = source.json.format;
	} catch (e) {
		if (isZWaveError(e) && e.code === ZWaveErrorCodes.NVM_InvalidFormat) {
			// This is not a 700 series NVM, maybe it is a 500 series one?
			source = {
				type: 500,
				json: nvm500ToJSON(sourceNVM),
			};
		} else if (
			isZWaveError(e) &&
			e.code === ZWaveErrorCodes.NVM_NotSupported &&
			isObject(e.context) &&
			typeof e.context.protocolFileFormat === "number"
		) {
			// This is a 700 series NVM, but the protocol version is not (yet) supported
			source = { type: "unknown" };
			sourceProtocolFileFormat = e.context.protocolFileFormat;
		} else {
			source = { type: "unknown" };
		}
	}

	try {
		target = {
			type: 700,
			json: nvmToJSON(targetNVM),
		};
		targetProtocolFileFormat = target.json.format;
	} catch (e) {
		if (isZWaveError(e) && e.code === ZWaveErrorCodes.NVM_InvalidFormat) {
			// This is not a 700 series NVM, maybe it is a 500 series one?
			target = {
				type: 500,
				json: nvm500ToJSON(targetNVM),
			};
		} else if (
			isZWaveError(e) &&
			e.code === ZWaveErrorCodes.NVM_NotSupported &&
			source.type === 700 &&
			isObject(e.context) &&
			typeof e.context.protocolFileFormat === "number"
		) {
			// This is a 700 series NVM, but the protocol version is not (yet) supported
			target = { type: "unknown" };
			targetProtocolFileFormat = e.context.protocolFileFormat;
		} else {
			target = { type: "unknown" };
		}
	}

	// Short circuit if...
	if (
		target.type === "unknown" &&
		targetProtocolFileFormat &&
		targetProtocolFileFormat > MAX_PROTOCOL_FILE_FORMAT &&
		sourceProtocolFileFormat &&
		sourceProtocolFileFormat <= targetProtocolFileFormat
	) {
		// ...both the source and the target are 700 series, but at least the target uses an unsupported protocol version.
		// We can be sure hwoever that the target can upgrade any 700 series NVM to its protocol version, as long as the
		// source protocol version is not higher than the target's
		return sourceNVM;
	} else if (source.type === 700 && target.type === 700) {
		//... the source and target protocol versions are compatible without conversion
		const sourceProtocolVersion = source.json.controller.protocolVersion;
		const targetProtocolVersion = target.json.controller.protocolVersion;
		// ... and the application version on the both is compatible with the respective protocol version
		const sourceApplicationVersion =
			source.json.controller.applicationVersion;
		const targetApplicationVersion =
			target.json.controller.applicationVersion;

		// The 700 series firmware can automatically upgrade backups from a previous protocol version
		// Not sure when that ability was added. To be on the safe side, allow it for 7.16+ which definitely supports it.
		if (
			semver.gte(targetProtocolVersion, "7.16.0") &&
			semver.gte(targetProtocolVersion, sourceProtocolVersion) &&
			// the application version is updated on every update, protocol version only when the format changes
			// so this is a good indicator if the NVMs are in a compatible state
			semver.gte(targetApplicationVersion, targetProtocolVersion) &&
			semver.gte(sourceApplicationVersion, sourceProtocolVersion) &&
			// avoid preserving broken 255.x versions which appear on some controllers
			semver.lt(sourceApplicationVersion, "255.0.0") &&
			semver.lt(targetApplicationVersion, "255.0.0")
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

	// Some 700 series NVMs have a strange 255.x application version - fix that first
	if (
		target.type === 700 &&
		semver.gte(target.json.controller.applicationVersion, "255.0.0")
	) {
		// replace both with the protocol version
		target.json.controller.applicationVersion =
			target.json.controller.protocolVersion;
	}

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
		// 700 series distinguishes the NVM format by the application version
		return jsonToNVM(json, target.json.controller.applicationVersion);
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
		// 700 series distinguishes the NVM format by the application version
		return jsonToNVM(json, target.json.controller.applicationVersion);
	}
}
