import { encodeBitMask, NODE_ID_MAX, parseBitMask } from "@zwave-js/core";
import type { NVMObject } from "../object";
import {
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export interface ProtocolNodeMaskFileOptions extends NVMFileCreationOptions {
	nodeIds: number[];
}

export class ProtocolNodeMaskFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ProtocolNodeMaskFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeIds = parseBitMask(this.payload);
		} else {
			this.nodeIds = options.nodeIds;
		}
	}

	public nodeIds: number[];

	public serialize(): NVMObject {
		this.payload = encodeBitMask(this.nodeIds, NODE_ID_MAX);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"node IDs": this.nodeIds.join(", "),
		};
	}
}

@nvmFileID(0x50005)
export class ProtocolNodeListFile extends ProtocolNodeMaskFile {}

@nvmFileID(0x50006)
export class ProtocolAppRouteLockNodeMaskFile extends ProtocolNodeMaskFile {}

@nvmFileID(0x50007)
export class ProtocolRouteSlaveSUCNodeMaskFile extends ProtocolNodeMaskFile {}

@nvmFileID(0x50008)
export class ProtocolSUCPendingUpdateNodeMaskFile extends ProtocolNodeMaskFile {}

@nvmFileID(0x50009)
export class ProtocolVirtualNodeMaskFile extends ProtocolNodeMaskFile {}

@nvmFileID(0x5000a)
export class ProtocolPendingDiscoveryNodeMaskFile extends ProtocolNodeMaskFile {}

@nvmFileID(0x5000b)
export class ProtocolRouteCacheExistsNodeMaskFile extends ProtocolNodeMaskFile {}

@nvmFileID(0x5000c)
export class ProtocolLRNodeListFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ProtocolNodeMaskFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeIds = parseBitMask(this.payload, 256);
		} else {
			this.nodeIds = options.nodeIds;
		}
	}

	public nodeIds: number[];

	public serialize(): NVMObject {
		// There are only 128 bytes for the bitmask, so the LR node IDs only go up to 1279
		this.payload = encodeBitMask(this.nodeIds, 1279, 256);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			payload: this.payload.toString("hex"),
			"node IDs": this.nodeIds.join(", "),
		};
	}
}
