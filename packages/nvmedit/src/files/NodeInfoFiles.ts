import { MAX_NODES, NUM_NODEMASK_BYTES, parseBitMask } from "@zwave-js/core";
import type { NVMObject } from "../object";
import {
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export const NODEINFOS_PER_FILE_V1 = 4;

export interface NodeInfo {
	nodeId: number;
	capability: number;
	security: number;
	generic: number;
	specific: number;
	neighbors: number[];
	sucUpdateIndex: number;
}

function parseNodeInfo(
	nodeId: number,
	buffer: Buffer,
	offset: number,
): NodeInfo {
	const capability = buffer[offset];
	const security = buffer[offset + 1];
	const generic = buffer[offset + 3];
	const specific = buffer[offset + 4];
	const neighbors = parseBitMask(
		buffer.slice(offset + 5, offset + 5 + NUM_NODEMASK_BYTES),
	);
	const sucUpdateIndex = buffer[offset + 5 + NUM_NODEMASK_BYTES];
	return {
		nodeId,
		capability,
		security,
		generic,
		specific,
		neighbors,
		sucUpdateIndex,
	};
}

function isActualNodeInfo(nodeInfo: NodeInfo): boolean {
	return !(
		nodeInfo.capability === 0xff &&
		nodeInfo.security === 0xff &&
		nodeInfo.generic === 0xff &&
		nodeInfo.specific === 0xff &&
		nodeInfo.sucUpdateIndex === 0xff
	);
}

export interface NodeInfoFileV0Options extends NVMFileCreationOptions {
	nodeInfo: NodeInfo;
}

@nvmFileID((id) => id >= 0x50100 && id < 0x50100 + MAX_NODES)
export class NodeInfoFileV0 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | NodeInfoFileV0Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeInfo = parseNodeInfo(
				this.fileId - 0x50100 + 1,
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
		};
	}
}

export interface NodeInfoFileV1Options extends NVMFileCreationOptions {
	nodeInfos: NodeInfo[];
}

@nvmFileID(
	(id) => id >= 0x50200 && id < 0x50200 + MAX_NODES / NODEINFOS_PER_FILE_V1,
)
export class NodeInfoFileV1 extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | NodeInfoFileV1Options,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeInfos = [];
			for (let i = 0; i < NODEINFOS_PER_FILE_V1; i++) {
				const nodeInfo = parseNodeInfo(
					(this.fileId - 0x50200) * NODEINFOS_PER_FILE_V1 + 1 + i,
					this.payload,
					i * 35,
				);
				if (isActualNodeInfo(nodeInfo)) {
					this.nodeInfos.push(nodeInfo);
				}
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
