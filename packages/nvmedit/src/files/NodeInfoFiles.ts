import {
	encodeBitMask,
	encodeNodeProtocolInfo,
	MAX_NODES,
	NodeProtocolInfo,
	NUM_NODEMASK_BYTES,
	parseBitMask,
	parseNodeProtocolInfo,
} from "@zwave-js/core";
import { pick } from "@zwave-js/shared";
import type { NVM3Object } from "../nvm3/object";
import {
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export const NODEINFOS_PER_FILE_V1 = 4;
const NODEINFO_SIZE = 1 + 5 + NUM_NODEMASK_BYTES;
const EMPTY_NODEINFO_FILL = 0xff;
const emptyNodeInfo = Buffer.alloc(NODEINFO_SIZE, EMPTY_NODEINFO_FILL);

export interface NodeInfo
	extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
	nodeId: number;
	genericDeviceClass: number;
	specificDeviceClass?: number | null;
	neighbors: number[];
	sucUpdateIndex: number;
}

function parseNodeInfo(
	nodeId: number,
	buffer: Buffer,
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
		buffer.slice(offset + 5, offset + 5 + NUM_NODEMASK_BYTES),
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

function encodeNodeInfo(nodeInfo: NodeInfo): Buffer {
	const ret = Buffer.alloc(1 + 5 + NUM_NODEMASK_BYTES);

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
	encodeNodeProtocolInfo(protocolInfo).copy(ret, 0);

	ret[3] = nodeInfo.genericDeviceClass;
	if (hasSpecificDeviceClass) ret[4] = nodeInfo.specificDeviceClass!;
	encodeBitMask(nodeInfo.neighbors, MAX_NODES).copy(ret, 5);
	ret[5 + NUM_NODEMASK_BYTES] = nodeInfo.sucUpdateIndex;

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

	public serialize(): NVM3Object {
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
		id >= NodeInfoFileV1IDBase &&
		id < NodeInfoFileV1IDBase + MAX_NODES / NODEINFOS_PER_FILE_V1,
)
export class NodeInfoFileV1 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | NodeInfoFileV1Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeInfos = [];
			for (let i = 0; i < NODEINFOS_PER_FILE_V1; i++) {
				const nodeId =
					(this.fileId - NodeInfoFileV1IDBase) *
						NODEINFOS_PER_FILE_V1 +
					1 +
					i;
				const offset = i * 35;
				const entry = this.payload.slice(offset, offset + 35);
				if (entry.equals(emptyNodeInfo)) continue;

				const nodeInfo = parseNodeInfo(nodeId, this.payload, i * 35);
				this.nodeInfos.push(nodeInfo);
			}
		} else {
			this.nodeInfos = options.nodeInfos;
		}
	}

	public nodeInfos: NodeInfo[];

	public serialize(): NVM3Object {
		// The infos must be sorted by node ID
		this.nodeInfos.sort((a, b) => a.nodeId - b.nodeId);
		const minNodeId = this.nodeInfos[0].nodeId;
		this.fileId = nodeIdToNodeInfoFileIDV1(minNodeId);

		this.payload = Buffer.alloc(
			NODEINFO_SIZE * NODEINFOS_PER_FILE_V1,
			EMPTY_NODEINFO_FILL,
		);

		const minFileNodeId =
			Math.floor((minNodeId - 1) / NODEINFOS_PER_FILE_V1) *
				NODEINFOS_PER_FILE_V1 +
			1;

		for (const nodeInfo of this.nodeInfos) {
			const offset = (nodeInfo.nodeId - minFileNodeId) * NODEINFO_SIZE;
			encodeNodeInfo(nodeInfo).copy(this.payload, offset);
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
