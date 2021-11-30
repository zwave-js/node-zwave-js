import { encodeBitMask, NODE_ID_MAX, parseBitMask } from "@zwave-js/core";
import type { NVM3Object } from "../nvm3/object";
import {
	getNVMFileIDStatic,
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

	public serialize(): NVM3Object {
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

@nvmFileID(0x50002)
export class ProtocolPreferredRepeatersFile extends ProtocolNodeMaskFile {}
export const ProtocolPreferredRepeatersFileID = getNVMFileIDStatic(
	ProtocolPreferredRepeatersFile,
);

@nvmFileID(0x50005)
export class ProtocolNodeListFile extends ProtocolNodeMaskFile {}
export const ProtocolNodeListFileID = getNVMFileIDStatic(ProtocolNodeListFile);

@nvmFileID(0x50006)
export class ProtocolAppRouteLockNodeMaskFile extends ProtocolNodeMaskFile {}
export const ProtocolAppRouteLockNodeMaskFileID = getNVMFileIDStatic(
	ProtocolAppRouteLockNodeMaskFile,
);

@nvmFileID(0x50007)
export class ProtocolRouteSlaveSUCNodeMaskFile extends ProtocolNodeMaskFile {}
export const ProtocolRouteSlaveSUCNodeMaskFileID = getNVMFileIDStatic(
	ProtocolRouteSlaveSUCNodeMaskFile,
);

@nvmFileID(0x50008)
export class ProtocolSUCPendingUpdateNodeMaskFile extends ProtocolNodeMaskFile {}
export const ProtocolSUCPendingUpdateNodeMaskFileID = getNVMFileIDStatic(
	ProtocolSUCPendingUpdateNodeMaskFile,
);

@nvmFileID(0x50009)
export class ProtocolVirtualNodeMaskFile extends ProtocolNodeMaskFile {}
export const ProtocolVirtualNodeMaskFileID = getNVMFileIDStatic(
	ProtocolVirtualNodeMaskFile,
);

@nvmFileID(0x5000a)
export class ProtocolPendingDiscoveryNodeMaskFile extends ProtocolNodeMaskFile {}
export const ProtocolPendingDiscoveryNodeMaskFileID = getNVMFileIDStatic(
	ProtocolPendingDiscoveryNodeMaskFile,
);

@nvmFileID(0x5000b)
export class ProtocolRouteCacheExistsNodeMaskFile extends ProtocolNodeMaskFile {}
export const ProtocolRouteCacheExistsNodeMaskFileID = getNVMFileIDStatic(
	ProtocolRouteCacheExistsNodeMaskFile,
);

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

	public serialize(): NVM3Object {
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
export const ProtocolLRNodeListFileID = getNVMFileIDStatic(
	ProtocolLRNodeListFile,
);
