import {
	type DataRate,
	type FLiRS,
	MAX_NODES,
	MAX_NODES_LR,
	NUM_NODEMASK_BYTES,
	type NodeProtocolInfo,
	NodeType,
	encodeBitMask,
	encodeNodeProtocolInfo,
	parseBitMask,
	parseNodeProtocolInfo,
} from "@zwave-js/core/safe";
import { Bytes, pick } from "@zwave-js/shared/safe";
import type { NVM3Object } from "../object.js";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile.js";

export const NODEINFOS_PER_FILE_V1 = 4;
export const LR_NODEINFOS_PER_FILE_V5 = 50;
const NODEINFO_SIZE = 1 + 5 + NUM_NODEMASK_BYTES;
const LR_NODEINFO_SIZE = 3;
const EMPTY_NODEINFO_FILL = 0xff;
const emptyNodeInfo = new Uint8Array(NODEINFO_SIZE).fill(EMPTY_NODEINFO_FILL);

export interface NodeInfo
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass">
{
	nodeId: number;
	genericDeviceClass: number;
	specificDeviceClass?: number | null;
	neighbors: number[];
	sucUpdateIndex: number;
}

function parseNodeInfo(
	nodeId: number,
	buffer: Uint8Array,
	offset: number,
): NodeInfo {
	const { hasSpecificDeviceClass, ...protocolInfo } = parseNodeProtocolInfo(
		buffer,
		offset,
	);
	const genericDeviceClass = buffer[offset + 3];
	const specificDeviceClass = hasSpecificDeviceClass
		? buffer[offset + 4]
		: null;
	const neighbors = parseBitMask(
		buffer.subarray(offset + 5, offset + 5 + NUM_NODEMASK_BYTES),
	);
	const sucUpdateIndex = buffer[offset + 5 + NUM_NODEMASK_BYTES];
	return {
		nodeId,
		...protocolInfo,
		genericDeviceClass,
		specificDeviceClass,
		neighbors,
		sucUpdateIndex,
	};
}

function encodeNodeInfo(nodeInfo: NodeInfo): Bytes {
	const ret = new Bytes(NODEINFO_SIZE);

	const hasSpecificDeviceClass = nodeInfo.specificDeviceClass != null;
	const protocolInfo: NodeProtocolInfo = {
		...pick(nodeInfo, [
			"isListening",
			"isFrequentListening",
			"isRouting",
			"supportedDataRates",
			"protocolVersion",
			"optionalFunctionality",
			"nodeType",
			"supportsSecurity",
			"supportsBeaming",
		]),
		hasSpecificDeviceClass,
	};
	ret.set(encodeNodeProtocolInfo(protocolInfo), 0);

	ret[3] = nodeInfo.genericDeviceClass;
	if (hasSpecificDeviceClass) ret[4] = nodeInfo.specificDeviceClass!;
	ret.set(encodeBitMask(nodeInfo.neighbors, MAX_NODES), 5);
	ret[5 + NUM_NODEMASK_BYTES] = nodeInfo.sucUpdateIndex;

	return ret;
}

export interface LRNodeInfo
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass">
{
	nodeId: number;
	genericDeviceClass: number;
	specificDeviceClass?: number | null;
}

function parseLRNodeInfo(
	nodeId: number,
	buffer: Uint8Array,
	offset: number,
): LRNodeInfo {
	// The node info in LR NVM files is packed:
	// Byte 0 CAPABILITY:
	//   Bit 0: Routing (?)
	//   Bit 1: Listening
	//   Bit 2: has specific device class (?)
	//   Bit 3: Beam capability
	//   Bit 4: Optional functionality
	//   Bits 5-6: FLiRS
	//   Bit 7: Unused (?)
	// Byte 1: Generic device class
	// Byte 2: Specific device class

	// Protocol version is always 3
	// Security is always true
	// Supported speed is always 100kbps (speed = 0, speed ext = 2)
	// Never: routing end node, controller

	const capability = buffer[offset];
	const isRouting = !!(capability & 0b0000_0001); // ZWLR Mesh??
	const isListening = !!(capability & 0b0000_0010);
	const hasSpecificDeviceClass = !!(capability & 0b0000_0100);
	const supportsBeaming = !!(capability & 0b0000_1000);
	const optionalFunctionality = !!(capability & 0b0001_0000);
	let isFrequentListening: FLiRS;
	switch (capability & 0b0110_0000) {
		case 0b0100_0000:
			isFrequentListening = "1000ms";
			break;
		case 0b0010_0000:
			isFrequentListening = "250ms";
			break;
		default:
			isFrequentListening = false;
	}
	const nodeType = NodeType["End Node"];
	const supportsSecurity = true;
	const protocolVersion = 3;
	const supportedDataRates: DataRate[] = [100000];

	return {
		nodeId,
		isRouting,
		isListening,
		supportsBeaming,
		isFrequentListening,
		optionalFunctionality,
		nodeType,
		supportsSecurity,
		protocolVersion,
		supportedDataRates,
		genericDeviceClass: buffer[offset + 1],
		specificDeviceClass: hasSpecificDeviceClass ? buffer[offset + 2] : null,
	};
}

function encodeLRNodeInfo(nodeInfo: LRNodeInfo): Uint8Array {
	const ret = new Bytes(LR_NODEINFO_SIZE);

	let capability = 0;
	if (nodeInfo.isRouting) capability |= 0b0000_0001;
	if (nodeInfo.isListening) capability |= 0b0000_0010;
	if (nodeInfo.specificDeviceClass != null) capability |= 0b0000_0100;
	if (nodeInfo.supportsBeaming) capability |= 0b0000_1000;
	if (nodeInfo.optionalFunctionality) capability |= 0b0001_0000;
	if (nodeInfo.isFrequentListening === "1000ms") {
		capability |= 0b0100_0000;
	} else if (nodeInfo.isFrequentListening === "250ms") {
		capability |= 0b0010_0000;
	}

	ret[0] = capability;
	ret[1] = nodeInfo.genericDeviceClass;
	ret[2] = nodeInfo.specificDeviceClass ?? 0;

	return ret;
}

export interface NodeInfoFileV0Options extends NVMFileCreationOptions {
	nodeInfo: NodeInfo;
}

export const NodeInfoFileV0IDBase = 0x50100;
export function nodeIdToNodeInfoFileIDV0(nodeId: number): number {
	return NodeInfoFileV0IDBase + nodeId - 1;
}

@nvmFileID(
	(id) => id >= NodeInfoFileV0IDBase && id < NodeInfoFileV0IDBase + MAX_NODES,
)
@nvmSection("protocol")
export class NodeInfoFileV0 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | NodeInfoFileV0Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeInfo = parseNodeInfo(
				this.fileId - NodeInfoFileV0IDBase + 1,
				this.payload,
				0,
			);
		} else {
			this.nodeInfo = options.nodeInfo;
		}
	}

	public nodeInfo: NodeInfo;

	public serialize(): NVM3Object & { data: Bytes } {
		this.fileId = nodeIdToNodeInfoFileIDV0(this.nodeInfo.nodeId);
		this.payload = encodeNodeInfo(this.nodeInfo);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			nodeInfo: this.nodeInfo,
		};
	}
}

export interface NodeInfoFileV1Options extends NVMFileCreationOptions {
	nodeInfos: NodeInfo[];
}

export const NodeInfoFileV1IDBase = 0x50200;
export function nodeIdToNodeInfoFileIDV1(nodeId: number): number {
	return (
		NodeInfoFileV1IDBase + Math.floor((nodeId - 1) / NODEINFOS_PER_FILE_V1)
	);
}

@nvmFileID(
	(id) =>
		id >= NodeInfoFileV1IDBase
		&& id < NodeInfoFileV1IDBase + MAX_NODES / NODEINFOS_PER_FILE_V1,
)
@nvmSection("protocol")
export class NodeInfoFileV1 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | NodeInfoFileV1Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeInfos = [];
			for (let i = 0; i < NODEINFOS_PER_FILE_V1; i++) {
				const nodeId = (this.fileId - NodeInfoFileV1IDBase)
						* NODEINFOS_PER_FILE_V1
					+ 1
					+ i;
				const offset = i * NODEINFO_SIZE;
				const entry = this.payload.subarray(
					offset,
					offset + NODEINFO_SIZE,
				);
				if (entry.equals(emptyNodeInfo)) continue;

				const nodeInfo = parseNodeInfo(
					nodeId,
					entry,
					0,
				);
				this.nodeInfos.push(nodeInfo);
			}
		} else {
			this.nodeInfos = options.nodeInfos;
		}
	}

	public nodeInfos: NodeInfo[];

	public serialize(): NVM3Object & { data: Bytes } {
		// The infos must be sorted by node ID
		this.nodeInfos.sort((a, b) => a.nodeId - b.nodeId);
		const minNodeId = this.nodeInfos[0].nodeId;
		this.fileId = nodeIdToNodeInfoFileIDV1(minNodeId);

		this.payload = new Bytes(NODEINFO_SIZE * NODEINFOS_PER_FILE_V1).fill(
			EMPTY_NODEINFO_FILL,
		);

		const minFileNodeId =
			Math.floor((minNodeId - 1) / NODEINFOS_PER_FILE_V1)
				* NODEINFOS_PER_FILE_V1
			+ 1;

		for (const nodeInfo of this.nodeInfos) {
			const offset = (nodeInfo.nodeId - minFileNodeId) * NODEINFO_SIZE;
			this.payload.set(encodeNodeInfo(nodeInfo), offset);
		}

		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"node infos": this.nodeInfos,
		};
	}
}

export interface LRNodeInfoFileV5Options extends NVMFileCreationOptions {
	nodeInfos: LRNodeInfo[];
}

export const LRNodeInfoFileV5IDBase = 0x50800;
export function nodeIdToLRNodeInfoFileIDV5(nodeId: number): number {
	return (
		LRNodeInfoFileV5IDBase
		+ Math.floor((nodeId - 256) / LR_NODEINFOS_PER_FILE_V5)
	);
}

// Counting starts with 5, because we only implemented this after reaching protocol file format 5
@nvmFileID(
	(id) =>
		id >= LRNodeInfoFileV5IDBase
		&& id
			< LRNodeInfoFileV5IDBase + MAX_NODES_LR / LR_NODEINFOS_PER_FILE_V5,
)
@nvmSection("protocol")
export class LRNodeInfoFileV5 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | LRNodeInfoFileV5Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeInfos = [];
			for (let i = 0; i < LR_NODEINFOS_PER_FILE_V5; i++) {
				const nodeId = (this.fileId - LRNodeInfoFileV5IDBase)
						* LR_NODEINFOS_PER_FILE_V5
					+ 256
					+ i;
				const offset = i * LR_NODEINFO_SIZE;
				const entry = this.payload.subarray(
					offset,
					offset + LR_NODEINFO_SIZE,
				);
				if (entry.equals(emptyNodeInfo)) continue;

				const nodeInfo = parseLRNodeInfo(
					nodeId,
					entry,
					0,
				);
				this.nodeInfos.push(nodeInfo);
			}
		} else {
			this.nodeInfos = options.nodeInfos;
		}
	}

	public nodeInfos: LRNodeInfo[];

	public serialize(): NVM3Object & { data: Bytes } {
		// The infos must be sorted by node ID
		this.nodeInfos.sort((a, b) => a.nodeId - b.nodeId);
		const minNodeId = this.nodeInfos[0].nodeId;
		this.fileId = nodeIdToLRNodeInfoFileIDV5(minNodeId);

		this.payload = new Bytes(LR_NODEINFO_SIZE * LR_NODEINFOS_PER_FILE_V5)
			.fill(EMPTY_NODEINFO_FILL);

		const minFileNodeId =
			Math.floor((minNodeId - 256) / LR_NODEINFOS_PER_FILE_V5)
				* LR_NODEINFOS_PER_FILE_V5
			+ 256;

		for (const nodeInfo of this.nodeInfos) {
			const offset = (nodeInfo.nodeId - minFileNodeId) * LR_NODEINFO_SIZE;
			this.payload.set(encodeLRNodeInfo(nodeInfo), offset);
		}

		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"node infos": this.nodeInfos,
		};
	}
}
