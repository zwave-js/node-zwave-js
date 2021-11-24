import {
	MAX_NODES,
	NodeProtocolInfo,
	NUM_NODEMASK_BYTES,
	parseBitMask,
	parseNodeProtocolInfo,
} from "@zwave-js/core";
import type { NVMObject } from "../object";
import {
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export const NODEINFOS_PER_FILE_V1 = 4;
const emptyNodeInfo = Buffer.alloc(1 + 5 + NUM_NODEMASK_BYTES, 0xff);

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

	public serialize(): NVMObject {
		throw new Error("Not implemented");
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

	public serialize(): NVMObject {
		throw new Error("Not implemented");
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
