import {
	ZWaveError,
	ZWaveErrorCodes,
	isZWaveError,
} from "@zwave-js/core/error";
import {
	type CommandClasses,
	ControllerCapabilityFlags,
	MAX_NODES,
	NodeIDType,
	type NodeProtocolInfo,
	NodeType,
	RFRegion,
	stripUndefined,
} from "@zwave-js/core/safe";
import {
	Bytes,
	buffer2hex,
	cloneDeep,
	num2hex,
	pick,
} from "@zwave-js/shared/safe";
import { isObject } from "alcalzone-shared/typeguards";
import type { SemVer } from "semver";
import semverGte from "semver/functions/gte.js";
import semverLt from "semver/functions/lt.js";
import semverLte from "semver/functions/lte.js";
import semverParse from "semver/functions/parse.js";
import { MAX_PROTOCOL_FILE_FORMAT, SUC_MAX_UPDATES } from "./consts.js";
import { NVM3, type NVM3Meta } from "./lib/NVM3.js";
import { NVM500 } from "./lib/NVM500.js";
import {
	type Route,
	type RouteCache,
	getEmptyRoute,
} from "./lib/common/routeCache.js";
import { type SUCUpdateEntry } from "./lib/common/sucUpdateEntry.js";
import { NVMMemoryIO } from "./lib/io/NVMMemoryIO.js";
import { NVM3Adapter } from "./lib/nvm3/adapter.js";
import {
	ZWAVE_APPLICATION_NVM_SIZE,
	ZWAVE_PROTOCOL_NVM_SIZE,
	ZWAVE_SHARED_NVM_SIZE,
} from "./lib/nvm3/consts.js";
import {
	type ApplicationNameFile,
	ApplicationNameFileID,
} from "./lib/nvm3/files/ApplicationNameFile.js";
import {
	ApplicationCCsFile,
	ApplicationCCsFileID,
	type ApplicationDataFile,
	ApplicationDataFileID,
	ApplicationRFConfigFile,
	ApplicationRFConfigFileID,
	ApplicationTypeFile,
	ApplicationTypeFileID,
	ApplicationVersionFile,
	ApplicationVersionFile800,
	ApplicationVersionFile800ID,
	ApplicationVersionFileID,
	ControllerInfoFile,
	ControllerInfoFileID,
	type ControllerInfoFileOptions,
	type LRNodeInfo,
	type LRNodeInfoFileV5,
	NVMFile,
	type NodeInfo,
	type NodeInfoFileV0,
	type NodeInfoFileV1,
	type ProtocolAppRouteLockNodeMaskFile,
	ProtocolAppRouteLockNodeMaskFileID,
	type ProtocolLRNodeListFile,
	ProtocolLRNodeListFileID,
	type ProtocolNodeListFile,
	ProtocolNodeListFileID,
	type ProtocolPendingDiscoveryNodeMaskFile,
	ProtocolPendingDiscoveryNodeMaskFileID,
	type ProtocolPreferredRepeatersFile,
	ProtocolPreferredRepeatersFileID,
	ProtocolRouteCacheExistsNodeMaskFile,
	ProtocolRouteCacheExistsNodeMaskFileID,
	type ProtocolRouteSlaveSUCNodeMaskFile,
	ProtocolRouteSlaveSUCNodeMaskFileID,
	type ProtocolSUCPendingUpdateNodeMaskFile,
	ProtocolSUCPendingUpdateNodeMaskFileID,
	ProtocolVersionFile,
	ProtocolVersionFileID,
	type ProtocolVirtualNodeMaskFile,
	ProtocolVirtualNodeMaskFileID,
	type RouteCacheFileV0,
	type RouteCacheFileV1,
	SUCUpdateEntriesFileIDV0,
	type SUCUpdateEntriesFileV0,
	type SUCUpdateEntriesFileV5,
	SUC_UPDATES_PER_FILE_V5,
	nodeIdToLRNodeInfoFileIDV5,
	nodeIdToNodeInfoFileIDV0,
	nodeIdToNodeInfoFileIDV1,
	nodeIdToRouteCacheFileIDV0,
	nodeIdToRouteCacheFileIDV1,
	sucUpdateIndexToSUCUpdateEntriesFileIDV5,
} from "./lib/nvm3/files/index.js";
import type { NVM3Object } from "./lib/nvm3/object.js";
import { dumpNVM, mapToObject } from "./lib/nvm3/utils.js";
import { NVM500Adapter } from "./lib/nvm500/adapter.js";
import { nvm500Impls } from "./lib/nvm500/impls/index.js";
import { resolveLayout } from "./lib/nvm500/shared.js";
import {
	type NVM500JSON,
	type NVM500JSONController,
	type NVM500JSONNode,
	type NVM500Meta,
} from "./nvm500/NVMParser.js";

export interface NVMJSON {
	format: number; // protocol file format
	applicationFileFormat?: number;
	meta?: NVM3Meta;
	controller: NVMJSONController;
	nodes: Record<number, NVMJSONNode>;
	lrNodes?: Record<number, NVMJSONLRNode>;
}

export type NVMJSONWithMeta = NVMJSON & { meta: NVM3Meta };

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
	applicationName?: string | null;
}

export interface NVMJSONControllerRFConfig {
	rfRegion: RFRegion;
	txPower: number;
	measured0dBm: number;
	enablePTI: number | null;
	maxTXPower: number | null;
	nodeIdType: NodeIDType | null;
}

export interface NVMJSONNodeWithInfo
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass">
{
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

export interface NVMJSONLRNode
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass">
{
	genericDeviceClass: number;
	specificDeviceClass?: number | null;
}

export type NVMJSONNode = NVMJSONNodeWithInfo | NVMJSONVirtualNode;

type ParsedNVM =
	| {
		type: 500;
		json: Required<NVM500JSON>;
	}
	| {
		type: 700;
		json: NVMJSONWithMeta;
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

function createEmptyLRNode(): NVMJSONLRNode {
	return {
		isListening: false,
		isFrequentListening: false,
		isRouting: false,
		supportedDataRates: [],
		protocolVersion: 3,
		optionalFunctionality: false,
		nodeType: NodeType["End Node"],
		supportsSecurity: true,
		supportsBeaming: false,
		genericDeviceClass: 0,
		specificDeviceClass: null,
	};
}

/** Converts a compressed set of NVM objects to a JSON representation */
export function nvmObjectsToJSON(
	objects: ReadonlyMap<number, NVM3Object>,
): NVMJSON {
	const nodes = new Map<number, NVMJSONNode>();
	const getNode = (id: number): NVMJSONNode => {
		if (!nodes.has(id)) nodes.set(id, createEmptyPhysicalNode());
		return nodes.get(id)!;
	};

	const lrNodes = new Map<number, NVMJSONLRNode>();
	const getLRNode = (id: number): NVMJSONLRNode => {
		if (!lrNodes.has(id)) lrNodes.set(id, createEmptyLRNode());
		return lrNodes.get(id)!;
	};

	const getObject = (
		id: number | ((id: number) => boolean),
	): NVM3Object | undefined => {
		if (typeof id === "number") {
			return objects.get(id);
		} else {
			for (const [key, obj] of objects) {
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
			`Object${
				typeof id === "number" ? ` ${num2hex(id)} (${id})` : ""
			} not found!`,
			ZWaveErrorCodes.NVM_ObjectNotFound,
		);
	};

	const getFileOrThrow = <T extends NVMFile>(
		id: number | ((id: number) => boolean),
		fileVersion: string,
	): T => {
		const obj = getObjectOrThrow(id);
		return NVMFile.from(obj.key, obj.data!, fileVersion) as T;
	};

	const getFile = <T extends NVMFile>(
		id: number | ((id: number) => boolean),
		fileVersion: string,
	): T | undefined => {
		const obj = getObject(id);
		if (!obj || !obj.data) return undefined;
		return NVMFile.from(obj.key, obj.data, fileVersion) as T;
	};

	// === Protocol NVM files ===

	// Figure out how to parse the individual files
	const protocolVersionFile = getFileOrThrow<ProtocolVersionFile>(
		ProtocolVersionFileID,
		"7.0.0", // We don't know the version here yet
	);
	const protocolFileFormat = protocolVersionFile.format;
	const protocolVersion =
		`${protocolVersionFile.major}.${protocolVersionFile.minor}.${protocolVersionFile.patch}`;

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

	// If they exist, read info about LR nodes
	const lrNodeIds = getFile<ProtocolLRNodeListFile>(
		ProtocolLRNodeListFileID,
		protocolVersion,
	)?.nodeIds;
	if (lrNodeIds) {
		for (const id of lrNodeIds) {
			const node = getLRNode(id);

			// Find node info
			const fileId = nodeIdToLRNodeInfoFileIDV5(id);
			const file = getFileOrThrow<LRNodeInfoFileV5>(
				fileId,
				protocolVersion,
			);
			const { nodeId, ...nodeInfo } = file.nodeInfos.find((i) =>
				i.nodeId === id
			)!;

			Object.assign(node, nodeInfo);
		}
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

	const applicationVersionFile700 = getFile<ApplicationVersionFile>(
		ApplicationVersionFileID,
		"7.0.0", // We don't know the version here yet
	);
	const applicationVersionFile800 = getFile<ApplicationVersionFile800>(
		ApplicationVersionFile800ID,
		"7.0.0", // We don't know the version here yet
	);
	const applicationVersionFile = applicationVersionFile700
		?? applicationVersionFile800;
	if (!applicationVersionFile) {
		throw new ZWaveError(
			"ApplicationVersionFile not found!",
			ZWaveErrorCodes.NVM_ObjectNotFound,
		);
	}
	const applicationVersion =
		`${applicationVersionFile.major}.${applicationVersionFile.minor}.${applicationVersionFile.patch}`;

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
	const applicationNameFile = getFile<ApplicationNameFile>(
		ApplicationNameFileID,
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
		protocolVersion,
		applicationVersion,
		homeId: buffer2hex(controllerInfoFile.homeId),
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
					nodeIdType: rfConfigFile.nodeIdType ?? null,
				},
			}
			: {}),
		sucUpdateEntries,
		applicationData: applicationDataFile?.applicationData.toString("hex")
			?? null,
		applicationName: applicationNameFile?.name ?? null,
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
	if (lrNodes.size > 0) {
		ret.lrNodes = mapToObject(lrNodes);
	}

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

function nvmJSONLRNodeToLRNodeInfo(
	nodeId: number,
	node: NVMJSONLRNode,
): LRNodeInfo {
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
		]),
	};
}

function nvmJSONControllerToFileOptions(
	ctrlr: NVMJSONController,
): ControllerInfoFileOptions {
	const ret = {
		homeId: Bytes.from(ctrlr.homeId.replace(/^0x/, ""), "hex"),
		nodeId: ctrlr.nodeId,
		lastNodeId: ctrlr.lastNodeId,
		staticControllerNodeId: ctrlr.staticControllerNodeId,
		sucLastIndex: ctrlr.sucLastIndex,
		controllerConfiguration: ctrlr.controllerConfiguration,
		maxNodeId: ctrlr.maxNodeId,
		reservedId: ctrlr.reservedId,
		systemState: ctrlr.systemState,
	} as unknown as ControllerInfoFileOptions;
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

/** Reads an NVM buffer of a 700+ series stick and returns its JSON representation */
export async function nvmToJSON(
	buffer: Uint8Array,
	debugLogs: boolean = false,
): Promise<NVMJSONWithMeta> {
	const io = new NVMMemoryIO(buffer);
	const nvm3 = new NVM3(io);
	const info = await nvm3.init();

	const adapter = new NVM3Adapter(nvm3);

	if (debugLogs) {
		// Dump all pages, all raw objects in each page, and each object in its final state
		await dumpNVM(nvm3);
	}

	const firstPageHeader = info.isSharedFileSystem
		? info.sections.all.pages[0]
		: info.sections.protocol.pages[0];

	const meta: NVM3Meta = {
		sharedFileSystem: info.isSharedFileSystem,
		...pick(firstPageHeader, [
			"pageSize",
			"writeSize",
			"memoryMapped",
			"deviceFamily",
		]),
	};

	const nodes = new Map<number, NVMJSONNode>();
	const getNode = (id: number): NVMJSONNode => {
		if (!nodes.has(id)) nodes.set(id, createEmptyPhysicalNode());
		return nodes.get(id)!;
	};

	const lrNodes = new Map<number, NVMJSONLRNode>();
	const getLRNode = (id: number): NVMJSONLRNode => {
		if (!lrNodes.has(id)) lrNodes.set(id, createEmptyLRNode());
		return lrNodes.get(id)!;
	};

	const protocolFileFormat = await adapter.get({
		domain: "controller",
		type: "protocolFileFormat",
	}, true);

	// Bail early if the NVM uses a protocol file format that's newer than we support
	if (protocolFileFormat > MAX_PROTOCOL_FILE_FORMAT) {
		throw new ZWaveError(
			`Unsupported protocol file format: ${protocolFileFormat}`,
			ZWaveErrorCodes.NVM_NotSupported,
			{ protocolFileFormat },
		);
	}

	const protocolVersion = await adapter.get({
		domain: "controller",
		type: "protocolVersion",
	}, true);

	// Read all flags for all nodes
	const appRouteLock = new Set(
		await adapter.get({
			domain: "controller",
			type: "appRouteLock",
		}, true),
	);
	const routeSlaveSUC = new Set(
		await adapter.get({
			domain: "controller",
			type: "routeSlaveSUC",
		}, true),
	);
	const sucPendingUpdate = new Set(
		await adapter.get({
			domain: "controller",
			type: "sucPendingUpdate",
		}, true),
	);
	const virtualNodeIds = new Set(
		await adapter.get({
			domain: "controller",
			type: "virtualNodeIds",
		}, true),
	);
	const pendingDiscovery = new Set(
		await adapter.get({
			domain: "controller",
			type: "pendingDiscovery",
		}, true),
	);

	// Figure out which nodes exist
	const nodeIds = await adapter.get({
		domain: "controller",
		type: "nodeIds",
	}, true);

	// And create each node entry, including virtual ones
	for (const id of nodeIds) {
		const node = getNode(id) as NVMJSONNodeWithInfo;

		// Find node info
		const nodeInfo = await adapter.get({
			domain: "node",
			nodeId: id,
			type: "info",
		}, true);

		Object.assign(node, nodeInfo);

		// Evaluate flags
		node.isVirtual = virtualNodeIds.has(id);
		node.appRouteLock = appRouteLock.has(id);
		node.routeSlaveSUC = routeSlaveSUC.has(id);
		node.sucPendingUpdate = sucPendingUpdate.has(id);
		node.pendingDiscovery = pendingDiscovery.has(id);

		const routes = await adapter.get({
			domain: "node",
			nodeId: id,
			type: "routes",
		});
		if (routes) {
			node.lwr = routes.lwr;
			node.nlwr = routes.nlwr;
		}

		// @ts-expect-error Some fields include a nodeId, but we don't need it
		delete node.nodeId;
	}

	// If they exist, read info about LR nodes
	const lrNodeIds = await adapter.get({
		domain: "controller",
		type: "lrNodeIds",
	});
	if (lrNodeIds) {
		for (const id of lrNodeIds) {
			const node = getLRNode(id);

			// Find node info
			const nodeInfo = await adapter.get({
				domain: "lrnode",
				nodeId: id,
				type: "info",
			}, true);

			Object.assign(node, nodeInfo);
		}
	}

	// Read info about the controller
	const sucUpdateEntries = await adapter.get({
		domain: "controller",
		type: "sucUpdateEntries",
	}, true);

	const applicationVersion = await adapter.get({
		domain: "controller",
		type: "applicationVersion",
	}, true);

	const applicationFileFormat = await adapter.get({
		domain: "controller",
		type: "applicationFileFormat",
	}, true);

	const applicationData = await adapter.get({
		domain: "controller",
		type: "applicationData",
	});

	const applicationName = await adapter.get({
		domain: "controller",
		type: "applicationName",
	});

	const preferredRepeaters = await adapter.get({
		domain: "controller",
		type: "preferredRepeaters",
	});

	// The following are a bit awkward to read one by one, so we just take the files
	const controllerInfoFile = await adapter.getFile<ControllerInfoFile>(
		ControllerInfoFileID,
		true,
	);
	const rfConfigFile = await adapter.getFile<ApplicationRFConfigFile>(
		ApplicationRFConfigFileID,
	);
	const applicationCCsFile = await adapter.getFile<ApplicationCCsFile>(
		ApplicationCCsFileID,
		true,
	);
	const applicationTypeFile = await adapter.getFile<ApplicationTypeFile>(
		ApplicationTypeFileID,
		true,
	);

	const controller: NVMJSONController = {
		protocolVersion,
		applicationVersion,
		homeId: buffer2hex(controllerInfoFile.homeId),
		...pick(controllerInfoFile, [
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
		]),
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
					nodeIdType: rfConfigFile.nodeIdType ?? null,
				},
			}
			: {}),
		sucUpdateEntries,
		applicationData:
			(applicationData && Bytes.view(applicationData).toString("hex"))
				?? null,
		applicationName: applicationName ?? null,
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

	const ret: NVMJSONWithMeta = {
		format: protocolFileFormat,
		controller,
		nodes: mapToObject(nodes),
		meta,
	};
	if (applicationFileFormat !== 0) {
		ret.applicationFileFormat = applicationFileFormat;
	}
	if (lrNodes.size > 0) {
		ret.lrNodes = mapToObject(lrNodes);
	}
	return ret;
}

/** Reads an NVM buffer of a 500-series stick and returns its JSON representation */
export async function nvm500ToJSON(
	buffer: Uint8Array,
): Promise<Required<NVM500JSON>> {
	const io = new NVMMemoryIO(buffer);
	const nvm = new NVM500(io);

	const info = await nvm.init();
	const meta: NVM500Meta = {
		library: info.library,
		...pick(info.nvmDescriptor, [
			"manufacturerID",
			"firmwareID",
			"productType",
			"productID",
		]),
	};

	const adapter = new NVM500Adapter(nvm);

	// Read all flags for all nodes
	const appRouteLock = new Set(
		await adapter.get({
			domain: "controller",
			type: "appRouteLock",
		}, true),
	);
	const routeSlaveSUC = new Set(
		await adapter.get({
			domain: "controller",
			type: "routeSlaveSUC",
		}, true),
	);
	const sucPendingUpdate = new Set(
		await adapter.get({
			domain: "controller",
			type: "sucPendingUpdate",
		}, true),
	);
	const virtualNodeIds = new Set(
		await adapter.get({
			domain: "controller",
			type: "virtualNodeIds",
		}) ?? [],
	);
	const pendingDiscovery = new Set(
		await adapter.get({
			domain: "controller",
			type: "pendingDiscovery",
		}, true),
	);

	// Figure out which nodes exist along with their info
	const nodes: Record<number, NVM500JSONNode> = {};
	for (let nodeId = 1; nodeId <= MAX_NODES; nodeId++) {
		const nodeInfo = await adapter.get({
			domain: "node",
			nodeId,
			type: "info",
		});
		const isVirtual = virtualNodeIds.has(nodeId);
		if (!nodeInfo) {
			if (isVirtual) {
				nodes[nodeId] = { isVirtual: true };
			}
			continue;
		}

		const routes = await adapter.get({
			domain: "node",
			nodeId,
			type: "routes",
		});

		// @ts-expect-error Some fields include a nodeId, but we don't need it
		delete nodeInfo.nodeId;

		nodes[nodeId] = {
			...nodeInfo,
			specificDeviceClass: nodeInfo.specificDeviceClass ?? null,
			isVirtual,

			appRouteLock: appRouteLock.has(nodeId),
			routeSlaveSUC: routeSlaveSUC.has(nodeId),
			sucPendingUpdate: sucPendingUpdate.has(nodeId),
			pendingDiscovery: pendingDiscovery.has(nodeId),

			lwr: routes?.lwr ?? null,
			nlwr: routes?.nlwr ?? null,
		};
	}

	// Read info about the controller
	const ownNodeId = await adapter.get({
		domain: "controller",
		type: "nodeId",
	}, true);

	const ownHomeId = await adapter.get({
		domain: "controller",
		type: "homeId",
	}, true);

	let learnedHomeId = await adapter.get({
		domain: "controller",
		type: "learnedHomeId",
	});
	if (learnedHomeId?.length === 4 && learnedHomeId.every((b) => b === 0)) {
		learnedHomeId = undefined;
	}

	const lastNodeId = await adapter.get({
		domain: "controller",
		type: "lastNodeId",
	}, true);

	const maxNodeId = await adapter.get({
		domain: "controller",
		type: "maxNodeId",
	}, true);

	const reservedId = await adapter.get({
		domain: "controller",
		type: "reservedId",
	}, true);

	const staticControllerNodeId = await adapter.get({
		domain: "controller",
		type: "staticControllerNodeId",
	}, true);

	const sucLastIndex = await adapter.get({
		domain: "controller",
		type: "sucLastIndex",
	}, true);

	const controllerConfiguration = await adapter.get({
		domain: "controller",
		type: "controllerConfiguration",
	}, true);

	const commandClasses = await adapter.get({
		domain: "controller",
		type: "commandClasses",
	}, true);

	const sucUpdateEntries = await adapter.get({
		domain: "controller",
		type: "sucUpdateEntries",
	}, true);

	const applicationData = await adapter.get({
		domain: "controller",
		type: "applicationData",
	});

	const preferredRepeaters = await adapter.get({
		domain: "controller",
		type: "preferredRepeaters",
	}, true);

	const systemState = await adapter.get({
		domain: "controller",
		type: "systemState",
	});

	const watchdogStarted = await adapter.get({
		domain: "controller",
		type: "watchdogStarted",
	}, true);

	const powerLevelNormal = await adapter.get({
		domain: "controller",
		type: "powerLevelNormal",
	});
	const powerLevelLow = await adapter.get({
		domain: "controller",
		type: "powerLevelLow",
	});
	const powerMode = await adapter.get({
		domain: "controller",
		type: "powerMode",
	});
	const powerModeExtintEnable = await adapter.get({
		domain: "controller",
		type: "powerModeExtintEnable",
	});
	const powerModeWutTimeout = await adapter.get({
		domain: "controller",
		type: "powerModeWutTimeout",
	});

	const controller: NVM500JSONController = {
		protocolVersion: info.nvmDescriptor.protocolVersion,
		applicationVersion: info.nvmDescriptor.firmwareVersion,
		ownHomeId: buffer2hex(ownHomeId),
		learnedHomeId: learnedHomeId
			? buffer2hex(learnedHomeId)
			: null,
		nodeId: ownNodeId,
		lastNodeId,
		staticControllerNodeId,
		sucLastIndex,
		controllerConfiguration,
		sucUpdateEntries,
		maxNodeId,
		reservedId,
		systemState,
		watchdogStarted,
		rfConfig: {
			powerLevelNormal,
			powerLevelLow,
			powerMode,
			powerModeExtintEnable,
			powerModeWutTimeout,
		},
		preferredRepeaters,
		commandClasses,
		applicationData:
			(applicationData && Bytes.view(applicationData).toString("hex"))
				?? null,
	};

	return {
		format: 500,
		meta,
		controller,
		nodes,
	};
}

export async function jsonToNVM(
	json: NVMJSON,
	targetSDKVersion: string,
): Promise<Uint8Array> {
	const parsedVersion = semverParse(targetSDKVersion);
	if (!parsedVersion) {
		throw new ZWaveError(
			`Invalid SDK version: ${targetSDKVersion}`,
			ZWaveErrorCodes.Argument_Invalid,
		);
	}

	// Erase the NVM
	const sharedFileSystem = json.meta?.sharedFileSystem;
	const nvmSize = sharedFileSystem
		? ZWAVE_SHARED_NVM_SIZE
		: (ZWAVE_APPLICATION_NVM_SIZE + ZWAVE_PROTOCOL_NVM_SIZE);
	const ret = new Uint8Array(nvmSize);
	const io = new NVMMemoryIO(ret);
	const nvm3 = new NVM3(io);
	await nvm3.erase(json.meta);

	const serializeFile = async (file: NVMFile) => {
		const { key, data } = file.serialize();
		await nvm3.set(key, data);
	};

	// Figure out which SDK version we are targeting
	let targetApplicationVersion: SemVer;
	let targetProtocolVersion: SemVer;
	let targetProtocolFormat: number;

	// We currently support application version migrations up to:
	const HIGHEST_SUPPORTED_SDK_VERSION = "7.21.0";
	// For all higher ones, set the highest version we support and let the controller handle the migration itself
	if (semverLte(targetSDKVersion, HIGHEST_SUPPORTED_SDK_VERSION)) {
		targetApplicationVersion = semverParse(targetSDKVersion)!;
	} else {
		targetApplicationVersion = semverParse(HIGHEST_SUPPORTED_SDK_VERSION)!;
	}

	// The protocol version file only seems to be updated when the format of the protocol file system changes
	// Once again, we simply set the highest version we support here and let the controller handle any potential migration
	if (semverGte(targetSDKVersion, "7.19.0")) {
		targetProtocolVersion = semverParse("7.19.0")!;
		targetProtocolFormat = 5;
	} else if (semverGte(targetSDKVersion, "7.17.0")) {
		targetProtocolVersion = semverParse("7.17.0")!;
		targetProtocolFormat = 4;
	} else if (semverGte(targetSDKVersion, "7.15.3")) {
		targetProtocolVersion = semverParse("7.15.3")!;
		targetProtocolFormat = 3;
	} else if (semverGte(targetSDKVersion, "7.12.0")) {
		targetProtocolVersion = semverParse("7.12.0")!;
		targetProtocolFormat = 2;
	} else if (semverGte(targetSDKVersion, "7.11.0")) {
		targetProtocolVersion = semverParse("7.11.0")!;
		targetProtocolFormat = 1;
	} else {
		targetProtocolVersion = semverParse("7.0.0")!;
		targetProtocolFormat = 0;
	}

	const target = cloneDeep(json);
	target.controller.protocolVersion = targetProtocolVersion.format();
	target.format = targetProtocolFormat;
	target.controller.applicationVersion = parsedVersion.format();

	// Write application and protocol version files, because they are required
	// for the NVM3 adapter to work.
	const ApplicationVersionConstructor = sharedFileSystem
		? ApplicationVersionFile800
		: ApplicationVersionFile;
	const applVersionFile = new ApplicationVersionConstructor({
		format: 0,
		major: targetApplicationVersion.major,
		minor: targetApplicationVersion.minor,
		patch: targetApplicationVersion.patch,
		fileVersion: targetProtocolVersion.format(), // does not matter for this file
	});
	await serializeFile(applVersionFile);

	const protocolVersionFile = new ProtocolVersionFile({
		format: targetProtocolFormat,
		major: targetProtocolVersion.major,
		minor: targetProtocolVersion.minor,
		patch: targetProtocolVersion.patch,
		fileVersion: targetProtocolVersion.format(), // does not matter for this file
	});
	await serializeFile(protocolVersionFile);
	{
		const { key, data } = protocolVersionFile.serialize();
		await nvm3.set(key, data);
	}

	// Now use the adapter where possible. Some properties have to be set together though,
	// so we set the files directly
	const adapter = new NVM3Adapter(nvm3);

	// Start with the application data

	const applTypeFile = new ApplicationTypeFile({
		...pick(target.controller, [
			"isListening",
			"optionalFunctionality",
			"genericDeviceClass",
			"specificDeviceClass",
		]),
		fileVersion: target.controller.applicationVersion,
	});
	adapter.setFile(applTypeFile);

	const applCCsFile = new ApplicationCCsFile({
		...pick(target.controller.commandClasses, [
			"includedInsecurely",
			"includedSecurelyInsecureCCs",
			"includedSecurelySecureCCs",
		]),
		fileVersion: target.controller.applicationVersion,
	});
	adapter.setFile(applCCsFile);

	// When converting it can be that the rfConfig doesn't exist. Make sure
	// that it is initialized with proper defaults.
	target.controller.rfConfig ??= {
		rfRegion: RFRegion["Default (EU)"],
		txPower: 0.0,
		measured0dBm: +3.3,
		enablePTI: null,
		maxTXPower: null,
		nodeIdType: null,
	};

	// Make sure the RF config format matches the application version.
	// Otherwise, the controller will ignore the file and not accept any changes to the RF config
	if (semverGte(targetSDKVersion, "7.15.3")) {
		target.controller.rfConfig.enablePTI ??= 0;
		target.controller.rfConfig.maxTXPower ??= 14.0;
	}
	if (semverGte(targetSDKVersion, "7.21.0")) {
		target.controller.rfConfig.nodeIdType ??= NodeIDType.Short;
	}

	const applRFConfigFile = new ApplicationRFConfigFile({
		...pick(target.controller.rfConfig, [
			"rfRegion",
			"txPower",
			"measured0dBm",
		]),
		enablePTI: target.controller.rfConfig.enablePTI ?? undefined,
		maxTXPower: target.controller.rfConfig.maxTXPower ?? undefined,
		nodeIdType: target.controller.rfConfig.nodeIdType ?? undefined,
		fileVersion: target.controller.applicationVersion,
	});
	adapter.setFile(applRFConfigFile);

	if (target.controller.applicationData) {
		await adapter.set(
			{ domain: "controller", type: "applicationData" },
			Bytes.from(target.controller.applicationData, "hex"),
		);
	}

	// The application name only seems to be used on 800 series with the shared file system
	if (target.controller.applicationName && target.meta?.sharedFileSystem) {
		await adapter.set(
			{ domain: "controller", type: "applicationName" },
			target.controller.applicationName,
		);
	}

	// Now the protocol data

	// TODO: node IDs and LR node IDs should probably be handled by the NVM adapter when
	// setting the node info. But then we need to make sure here that the files are guaranteed to exist
	const nodeInfoExists = new Set<number>();
	const lrNodeInfoExists = new Set<number>();
	const virtualNodeIds = new Set<number>();

	const appRouteLock = new Set<number>();
	const routeSlaveSUC = new Set<number>();
	const sucPendingUpdate = new Set<number>();
	const pendingDiscovery = new Set<number>();

	// Ensure that the route cache exists nodemask is written, even when no routes exist
	adapter.setFile(
		new ProtocolRouteCacheExistsNodeMaskFile({
			nodeIds: [],
			fileVersion: target.controller.protocolVersion,
		}),
	);

	for (const [id, node] of Object.entries(target.nodes)) {
		const nodeId = parseInt(id);
		if (!nodeHasInfo(node)) {
			virtualNodeIds.add(nodeId);
			continue;
		} else {
			nodeInfoExists.add(nodeId);
			if (node.isVirtual) virtualNodeIds.add(nodeId);
			if (node.appRouteLock) appRouteLock.add(nodeId);
			if (node.routeSlaveSUC) routeSlaveSUC.add(nodeId);
			if (node.sucPendingUpdate) sucPendingUpdate.add(nodeId);
			if (node.pendingDiscovery) pendingDiscovery.add(nodeId);
		}

		await adapter.set(
			{ domain: "node", nodeId, type: "info" },
			nvmJSONNodeToNodeInfo(nodeId, node),
		);

		if (node.lwr || node.nlwr) {
			await adapter.set(
				{ domain: "node", nodeId, type: "routes" },
				{
					lwr: node.lwr ?? getEmptyRoute(),
					nlwr: node.nlwr ?? getEmptyRoute(),
				},
			);
		}
	}
	await adapter.set(
		{ domain: "controller", type: "nodeIds" },
		[...nodeInfoExists],
	);

	if (target.lrNodes) {
		for (const [id, node] of Object.entries(target.lrNodes)) {
			const nodeId = parseInt(id);
			lrNodeInfoExists.add(nodeId);

			await adapter.set(
				{ domain: "lrnode", nodeId, type: "info" },
				nvmJSONLRNodeToLRNodeInfo(nodeId, node),
			);
		}
	}
	await adapter.set(
		{ domain: "controller", type: "lrNodeIds" },
		[...lrNodeInfoExists],
	);

	// For v3+ targets, the ControllerInfoFile must contain the LongRange properties
	// or the controller will ignore the file and not have a home ID
	if (targetProtocolFormat >= 3) {
		target.controller.lastNodeIdLR ??= 255;
		target.controller.maxNodeIdLR ??= 0;
		target.controller.reservedIdLR ??= 0;
		target.controller.primaryLongRangeChannelId ??= 0;
		target.controller.dcdcConfig ??= 255;
	}
	adapter.setFile(
		new ControllerInfoFile(
			nvmJSONControllerToFileOptions(target.controller),
		),
	);

	await adapter.set(
		{ domain: "controller", type: "appRouteLock" },
		[...appRouteLock],
	);
	await adapter.set(
		{ domain: "controller", type: "routeSlaveSUC" },
		[...routeSlaveSUC],
	);
	await adapter.set(
		{ domain: "controller", type: "sucPendingUpdate" },
		[...sucPendingUpdate],
	);
	await adapter.set(
		{ domain: "controller", type: "virtualNodeIds" },
		[...virtualNodeIds],
	);
	await adapter.set(
		{ domain: "controller", type: "pendingDiscovery" },
		[...pendingDiscovery],
	);

	if (target.controller.preferredRepeaters?.length) {
		await adapter.set(
			{ domain: "controller", type: "preferredRepeaters" },
			target.controller.preferredRepeaters,
		);
	}

	await adapter.set(
		{ domain: "controller", type: "sucUpdateEntries" },
		target.controller.sucUpdateEntries,
	);

	await adapter.commit();
	await io.close();
	return ret;
}

/** Takes a JSON represented 500 series NVM and converts it to binary */
export async function jsonToNVM500(
	json: Required<NVM500JSON>,
	protocolVersion: string,
): Promise<Uint8Array> {
	// Try to find a matching implementation
	const impl = nvm500Impls.find(
		(p) =>
			p.protocolVersions.includes(protocolVersion)
			&& p.name.toLowerCase().startsWith(json.meta.library),
	);

	if (!impl) {
		throw new ZWaveError(
			`Did not find a matching implementation for protocol version ${protocolVersion} and library ${json.meta.library}. To convert 500-series NVMs, both the source and the target controller must be using Z-Wave SDK 6.61 or higher.`,
			ZWaveErrorCodes.NVM_NotSupported,
		);
	}

	const { layout, nvmSize } = resolveLayout(impl.layout);

	// Erase the NVM and set some basic information
	const ret = new Uint8Array(nvmSize);
	const io = new NVMMemoryIO(ret);
	const nvm = new NVM500(io);
	await nvm.erase({
		layout,
		nvmSize,
		library: impl.library,
		nvmDescriptor: {
			...pick(json.meta, [
				"manufacturerID",
				"productType",
				"productID",
				"firmwareID",
			]),
			// Override the protocol version with the specified one
			protocolVersion,
			firmwareVersion: json.controller.applicationVersion,
		},
	});

	const adapter = new NVM500Adapter(nvm);

	// Set controller infos
	const c = json.controller;

	await adapter.set(
		{ domain: "controller", type: "homeId" },
		Bytes.from(c.ownHomeId.replace(/^0x/, ""), "hex"),
	);
	await adapter.set(
		{ domain: "controller", type: "learnedHomeId" },
		c.learnedHomeId
			? Bytes.from(c.learnedHomeId.replace(/^0x/, ""), "hex")
			: undefined,
	);

	await adapter.set(
		{ domain: "controller", type: "nodeId" },
		c.nodeId,
	);
	await adapter.set(
		{ domain: "controller", type: "lastNodeId" },
		c.lastNodeId,
	);
	await adapter.set(
		{ domain: "controller", type: "maxNodeId" },
		c.maxNodeId,
	);
	await adapter.set(
		{ domain: "controller", type: "reservedId" },
		c.reservedId,
	);
	await adapter.set(
		{ domain: "controller", type: "staticControllerNodeId" },
		c.staticControllerNodeId,
	);

	await adapter.set(
		{ domain: "controller", type: "controllerConfiguration" },
		c.controllerConfiguration,
	);

	await adapter.set(
		{ domain: "controller", type: "sucUpdateEntries" },
		c.sucUpdateEntries,
	);

	await adapter.set(
		{ domain: "controller", type: "sucLastIndex" },
		c.sucLastIndex,
	);

	if (c.systemState != undefined) {
		await adapter.set(
			{ domain: "controller", type: "systemState" },
			c.systemState,
		);
	}

	await adapter.set(
		{ domain: "controller", type: "watchdogStarted" },
		c.watchdogStarted,
	);

	if (c.rfConfig.powerLevelNormal != undefined) {
		await adapter.set(
			{ domain: "controller", type: "powerLevelNormal" },
			c.rfConfig.powerLevelNormal,
		);
	}
	if (c.rfConfig.powerLevelLow != undefined) {
		await adapter.set(
			{ domain: "controller", type: "powerLevelLow" },
			c.rfConfig.powerLevelLow,
		);
	}
	if (c.rfConfig.powerMode != undefined) {
		await adapter.set(
			{ domain: "controller", type: "powerMode" },
			c.rfConfig.powerMode,
		);
	}
	if (c.rfConfig.powerModeExtintEnable != undefined) {
		await adapter.set(
			{ domain: "controller", type: "powerModeExtintEnable" },
			c.rfConfig.powerModeExtintEnable,
		);
	}
	if (c.rfConfig.powerModeWutTimeout != undefined) {
		await adapter.set(
			{ domain: "controller", type: "powerModeWutTimeout" },
			c.rfConfig.powerModeWutTimeout,
		);
	}

	await adapter.set(
		{ domain: "controller", type: "preferredRepeaters" },
		c.preferredRepeaters,
	);

	await adapter.set(
		{ domain: "controller", type: "commandClasses" },
		c.commandClasses,
	);

	if (c.applicationData) {
		await adapter.set(
			{ domain: "controller", type: "applicationData" },
			Bytes.from(c.applicationData, "hex"),
		);
	}

	// Set node infos
	const appRouteLock: number[] = [];
	const routeSlaveSUC: number[] = [];
	const pendingDiscovery: number[] = [];
	const sucPendingUpdate: number[] = [];
	const virtualNodeIds: number[] = [];

	for (const [id, node] of Object.entries(json.nodes)) {
		const nodeId = parseInt(id);
		if (!nodeHasInfo(node)) {
			virtualNodeIds.push(nodeId);
			continue;
		}
		if (node.appRouteLock) appRouteLock.push(nodeId);
		if (node.routeSlaveSUC) routeSlaveSUC.push(nodeId);
		if (node.pendingDiscovery) pendingDiscovery.push(nodeId);
		if (node.sucPendingUpdate) sucPendingUpdate.push(nodeId);

		await adapter.set(
			{ domain: "node", nodeId, type: "info" },
			{
				nodeId,
				...node,
			},
		);

		if (node.lwr || node.nlwr) {
			await adapter.set(
				{ domain: "node", nodeId, type: "routes" },
				{
					lwr: node.lwr ?? undefined,
					nlwr: node.nlwr ?? undefined,
				},
			);
		}
	}

	await adapter.set(
		{ domain: "controller", type: "appRouteLock" },
		[...appRouteLock],
	);
	await adapter.set(
		{ domain: "controller", type: "routeSlaveSUC" },
		[...routeSlaveSUC],
	);
	await adapter.set(
		{ domain: "controller", type: "sucPendingUpdate" },
		[...sucPendingUpdate],
	);
	await adapter.set(
		{ domain: "controller", type: "virtualNodeIds" },
		[...virtualNodeIds],
	);
	await adapter.set(
		{ domain: "controller", type: "pendingDiscovery" },
		[...pendingDiscovery],
	);

	await adapter.commit();
	await io.close();
	return ret;
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
		let raw = Bytes.from(source.controller.applicationData, "hex");
		// Find actual start and end of application data, ignoring zeroes
		let start = 0;
		while (start < raw.length && raw[start] === 0) {
			start++;
		}
		let end = raw.length - 1;
		while (end > start && raw[end] === 0) {
			end--;
		}
		raw = raw.subarray(start, end + 1);
		if (raw.length > 512) {
			if (!truncateApplicationData) {
				throw new ZWaveError(
					"Invalid NVM JSON: Application data would be truncated! Set truncateApplicationData to true to allow this.",
					ZWaveErrorCodes.NVM_InvalidJSON,
				);
			}
			raw = raw.subarray(0, 512);
		}
		applicationData = raw.toString("hex");
	}

	// https://github.com/zwave-js/zwave-js/issues/6055
	// On some controllers this byte can be 0xff (effectively not set)
	let controllerConfiguration = source.controller.controllerConfiguration;
	if (source.controller.controllerConfiguration === 0xff) {
		// Default to SUC/Primary
		controllerConfiguration = ControllerCapabilityFlags.SISPresent
			| ControllerCapabilityFlags.WasRealPrimary
			| ControllerCapabilityFlags.SUC;
	}

	let homeId: string;
	if (
		!!(
			controllerConfiguration & ControllerCapabilityFlags.OnOtherNetwork
		)
		&& source.controller.learnedHomeId
		&& source.controller.nodeId
	) {
		// The controller did not start the network itself. We only keep this if we have a home ID and node ID
		homeId = source.controller.learnedHomeId;
	} else {
		// The controller did start the network itself
		homeId = source.controller.ownHomeId;
		controllerConfiguration &= ~ControllerCapabilityFlags.OnOtherNetwork;
		// Reconstruct the node ID. If we don't know, 1 is a good default
		if (controllerConfiguration & ControllerCapabilityFlags.SUC) {
			source.controller.nodeId = source.controller.staticControllerNodeId
				|| 1;
		} else {
			source.controller.nodeId = 1;
		}
	}

	// https://github.com/zwave-js/zwave-js/issues/6055
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
			systemState: source.controller.systemState ?? 0,
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
		source.controller.controllerConfiguration
		& ControllerCapabilityFlags.OnOtherNetwork
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
export async function migrateNVM(
	sourceNVM: Uint8Array,
	targetNVM: Uint8Array,
): Promise<Uint8Array> {
	let source: ParsedNVM;
	let target: ParsedNVM;
	let sourceProtocolFileFormat: number | undefined;
	let targetProtocolFileFormat: number | undefined;

	try {
		source = {
			type: 700,
			json: await nvmToJSON(sourceNVM),
		};
		sourceProtocolFileFormat = source.json.format;
	} catch (e) {
		if (isZWaveError(e) && e.code === ZWaveErrorCodes.NVM_InvalidFormat) {
			// This is not a 700 series NVM, maybe it is a 500 series one?
			source = {
				type: 500,
				json: await nvm500ToJSON(sourceNVM),
			};
		} else if (
			isZWaveError(e)
			&& e.code === ZWaveErrorCodes.NVM_NotSupported
			&& isObject(e.context)
			&& typeof e.context.protocolFileFormat === "number"
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
			json: await nvmToJSON(targetNVM),
		};
		targetProtocolFileFormat = target.json.format;
	} catch (e) {
		if (isZWaveError(e) && e.code === ZWaveErrorCodes.NVM_InvalidFormat) {
			// This is not a 700 series NVM, maybe it is a 500 series one?
			target = {
				type: 500,
				json: await nvm500ToJSON(targetNVM),
			};
		} else if (
			isZWaveError(e)
			&& e.code === ZWaveErrorCodes.NVM_NotSupported
			&& source.type === 700
			&& isObject(e.context)
			&& typeof e.context.protocolFileFormat === "number"
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
		target.type === "unknown"
		&& targetProtocolFileFormat
		&& targetProtocolFileFormat > MAX_PROTOCOL_FILE_FORMAT
		&& sourceProtocolFileFormat
		&& sourceProtocolFileFormat <= targetProtocolFileFormat
		&& sourceNVM.length === targetNVM.length
	) {
		// ...both the source and the target are 700 series, but at least the target uses an unsupported protocol version.
		// We can be sure however that the target can upgrade any 700 series NVM to its protocol version, as long as the
		// source protocol version is not higher than the target's
		return sourceNVM;
	} else if (
		source.type === 700
		&& target.type === 700
		// ...the source and target NVMs have the same size and structure
		&& sourceNVM.length === targetNVM.length
		&& source.json.meta.sharedFileSystem
			=== target.json.meta.sharedFileSystem
	) {
		// ... the source and target protocol versions are compatible without conversion
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
			semverGte(targetProtocolVersion, "7.16.0")
			&& semverGte(targetProtocolVersion, sourceProtocolVersion)
			// the application version is updated on every update, protocol version only when the format changes
			// so this is a good indicator if the NVMs are in a compatible state
			&& semverGte(targetApplicationVersion, targetProtocolVersion)
			&& semverGte(sourceApplicationVersion, sourceProtocolVersion)
			// avoid preserving broken 255.x versions which appear on some controllers
			&& semverLt(sourceApplicationVersion, "255.0.0")
			&& semverLt(targetApplicationVersion, "255.0.0")
			// and avoid restoring a backup with a shifted 800 series application version file
			&& (!hasShiftedAppVersion800File(source.json))
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
		target.type === 700
		&& semverGte(target.json.controller.applicationVersion, "255.0.0")
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
		const json: NVMJSONWithMeta = {
			lrNodes: {},
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
		const json: NVMJSONWithMeta = {
			...(source.json as NVMJSONWithMeta),
			meta: (target.json as NVMJSONWithMeta).meta,
		};
		// 700 series distinguishes the NVM format by the application version
		return jsonToNVM(json, target.json.controller.applicationVersion);
	}
}

/**
 * Detects whether the app version file on a 800 series controller is shifted by 1 byte
 */
function hasShiftedAppVersion800File(
	json: NVMJSONWithMeta,
): boolean {
	// We can only detect this on 800 series controllers with the shared FS
	if (!json.meta.sharedFileSystem) return false;

	const protocolVersion = semverParse(json.controller.protocolVersion);
	// Invalid protocol version, cannot fix anything
	if (!protocolVersion) return false;

	const applicationVersion = semverParse(json.controller.applicationVersion);
	// Invalid application version, cannot fix anything
	if (!applicationVersion) return false;

	// We consider the version shifted if:
	// - the app version format is the major protocol version
	// - the app version major is the minor protocol version +/- 3

	if (json.applicationFileFormat !== protocolVersion.major) return false;
	if (Math.abs(applicationVersion.major - protocolVersion.minor) > 3) {
		return false;
	}

	return true;
}
