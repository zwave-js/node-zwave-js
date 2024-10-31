import { NODE_ID_MAX, encodeBitMask, parseBitMask } from "@zwave-js/core/safe";
import { type Bytes } from "@zwave-js/shared/safe";
import type { NVM3Object } from "../object.js";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile.js";

export interface ProtocolNodeMaskFileOptions extends NVMFileCreationOptions {
	nodeIds: number[];
}

export class ProtocolNodeMaskFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ProtocolNodeMaskFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeIdSet = new Set(parseBitMask(this.payload));
		} else {
			this.nodeIdSet = new Set(options.nodeIds);
		}
	}

	public nodeIdSet: Set<number>;
	public get nodeIds(): number[] {
		return [...this.nodeIdSet];
	}
	public set nodeIds(value: number[]) {
		this.nodeIdSet = new Set(value);
	}

	public serialize(): NVM3Object & { data: Bytes } {
		this.payload = encodeBitMask([...this.nodeIdSet], NODE_ID_MAX);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"node IDs": [...this.nodeIdSet].join(", "),
		};
	}
}

export const ProtocolPreferredRepeatersFileID = 0x50002;

@nvmFileID(ProtocolPreferredRepeatersFileID)
@nvmSection("protocol")
export class ProtocolPreferredRepeatersFile extends ProtocolNodeMaskFile {}

export const ProtocolNodeListFileID = 0x50005;

@nvmFileID(ProtocolNodeListFileID)
@nvmSection("protocol")
export class ProtocolNodeListFile extends ProtocolNodeMaskFile {}

export const ProtocolAppRouteLockNodeMaskFileID = 0x50006;

@nvmFileID(ProtocolAppRouteLockNodeMaskFileID)
@nvmSection("protocol")
export class ProtocolAppRouteLockNodeMaskFile extends ProtocolNodeMaskFile {}

export const ProtocolRouteSlaveSUCNodeMaskFileID = 0x50007;

@nvmFileID(ProtocolRouteSlaveSUCNodeMaskFileID)
@nvmSection("protocol")
export class ProtocolRouteSlaveSUCNodeMaskFile extends ProtocolNodeMaskFile {}

export const ProtocolSUCPendingUpdateNodeMaskFileID = 0x50008;

@nvmFileID(ProtocolSUCPendingUpdateNodeMaskFileID)
@nvmSection("protocol")
export class ProtocolSUCPendingUpdateNodeMaskFile
	extends ProtocolNodeMaskFile
{}

export const ProtocolVirtualNodeMaskFileID = 0x50009;

@nvmFileID(ProtocolVirtualNodeMaskFileID)
@nvmSection("protocol")
export class ProtocolVirtualNodeMaskFile extends ProtocolNodeMaskFile {}

export const ProtocolPendingDiscoveryNodeMaskFileID = 0x5000a;

@nvmFileID(ProtocolPendingDiscoveryNodeMaskFileID)
@nvmSection("protocol")
export class ProtocolPendingDiscoveryNodeMaskFile
	extends ProtocolNodeMaskFile
{}

export const ProtocolRouteCacheExistsNodeMaskFileID = 0x5000b;

@nvmFileID(ProtocolRouteCacheExistsNodeMaskFileID)
@nvmSection("protocol")
export class ProtocolRouteCacheExistsNodeMaskFile
	extends ProtocolNodeMaskFile
{}

export const ProtocolLRNodeListFileID = 0x5000c;

@nvmFileID(ProtocolLRNodeListFileID)
@nvmSection("protocol")
export class ProtocolLRNodeListFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ProtocolNodeMaskFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeIdSet = new Set(parseBitMask(this.payload, 256));
		} else {
			this.nodeIdSet = new Set(options.nodeIds);
		}
	}

	public nodeIdSet: Set<number>;
	public get nodeIds(): number[] {
		return [...this.nodeIdSet];
	}
	public set nodeIds(value: number[]) {
		this.nodeIdSet = new Set(value);
	}

	public serialize(): NVM3Object & { data: Bytes } {
		// There are only 128 bytes for the bitmask, so the LR node IDs only go up to 1279
		this.payload = encodeBitMask([...this.nodeIdSet], 1279, 256);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			"node IDs": [...this.nodeIdSet].join(", "),
		};
	}
}
