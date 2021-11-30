import { stripUndefined } from "@zwave-js/core";
import { buffer2hex } from "@zwave-js/shared";
import type { NVM3Object } from "../nvm3/object";
import {
	getNVMFileIDStatic,
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export type ControllerInfoFileOptions = NVMFileCreationOptions & {
	homeId: Buffer;
	nodeId: number;
	lastNodeId: number;
	staticControllerNodeId: number;
	sucLastIndex: number;
	controllerConfiguration: number;
	maxNodeId: number;
	reservedId: number;
	systemState: number;
} & (
		| {
				sucAwarenessPushNeeded: number;
		  }
		| {
				lastNodeIdLR: number;
				maxNodeIdLR: number;
				reservedIdLR: number;
				primaryLongRangeChannelId: number;
				dcdcConfig: number;
		  }
	);

@nvmFileID(0x50004)
export class ControllerInfoFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ControllerInfoFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.homeId = this.payload.slice(0, 4);
			if (this.payload.length === 13) {
				this.nodeId = this.payload[4];
				this.lastNodeId = this.payload[5];
				this.staticControllerNodeId = this.payload[6];
				this.sucLastIndex = this.payload[7];
				this.controllerConfiguration = this.payload[8];
				this.sucAwarenessPushNeeded = this.payload[9];
				this.maxNodeId = this.payload[10];
				this.reservedId = this.payload[11];
				this.systemState = this.payload[12];
			} else if (this.payload.length === 22) {
				this.nodeId = this.payload.readUInt16LE(4);
				this.staticControllerNodeId = this.payload.readUInt16LE(6);
				this.lastNodeIdLR = this.payload.readUInt16LE(8);
				this.lastNodeId = this.payload[10];
				this.sucLastIndex = this.payload[11];
				this.maxNodeIdLR = this.payload.readUInt16LE(12);
				this.maxNodeId = this.payload[14];
				this.controllerConfiguration = this.payload[15];
				this.reservedIdLR = this.payload.readUInt16LE(16);
				this.reservedId = this.payload[18];
				this.systemState = this.payload[19];
				this.primaryLongRangeChannelId = this.payload[20];
				this.dcdcConfig = this.payload[21];
			} else {
				throw new Error(`Unsupported payload length`);
			}
		} else {
			this.homeId = options.homeId;
			this.nodeId = options.nodeId;
			this.lastNodeId = options.lastNodeId;
			this.staticControllerNodeId = options.staticControllerNodeId;
			this.sucLastIndex = options.sucLastIndex;
			this.controllerConfiguration = options.controllerConfiguration;
			this.maxNodeId = options.maxNodeId;
			this.reservedId = options.reservedId;
			this.systemState = options.systemState;
			if ("lastNodeIdLR" in options) {
				this.lastNodeIdLR = options.lastNodeIdLR;
				this.maxNodeIdLR = options.maxNodeIdLR;
				this.reservedIdLR = options.reservedIdLR;
				this.primaryLongRangeChannelId =
					options.primaryLongRangeChannelId;
				this.dcdcConfig = options.dcdcConfig;
			} else {
				this.sucAwarenessPushNeeded = options.sucAwarenessPushNeeded;
			}
		}
	}

	public homeId: Buffer;
	public nodeId: number;
	public lastNodeId: number;
	public staticControllerNodeId: number;
	public sucLastIndex: number;
	public controllerConfiguration: number; // TODO: Figure out what this is
	public sucAwarenessPushNeeded?: number;
	public maxNodeId: number;
	public reservedId: number;
	public systemState: number;
	public lastNodeIdLR?: number;
	public maxNodeIdLR?: number;
	public reservedIdLR?: number;
	public primaryLongRangeChannelId?: number;
	public dcdcConfig?: number;

	public serialize(): NVM3Object {
		if (this.lastNodeIdLR != undefined) {
			this.payload = Buffer.allocUnsafe(22);
			this.homeId.copy(this.payload, 0);
			this.payload.writeUInt16LE(this.nodeId, 4);
			this.payload.writeUInt16LE(this.staticControllerNodeId, 6);
			this.payload.writeUInt16LE(this.lastNodeIdLR, 8);
			this.payload[10] = this.lastNodeId;
			this.payload[11] = this.sucLastIndex;
			this.payload.writeUInt16LE(this.maxNodeIdLR!, 12);
			this.payload[14] = this.maxNodeId;
			this.payload[15] = this.controllerConfiguration;
			this.payload.writeUInt16LE(this.reservedIdLR!, 16);
			this.payload[18] = this.reservedId;
			this.payload[19] = this.systemState;
			this.payload[20] = this.primaryLongRangeChannelId!;
			this.payload[21] = this.dcdcConfig!;
		} else {
			// V0
			this.payload = Buffer.concat([
				this.homeId,
				Buffer.from([
					this.nodeId,
					this.lastNodeId,
					this.staticControllerNodeId,
					this.sucLastIndex,
					this.controllerConfiguration,
					this.sucAwarenessPushNeeded ?? 0,
					this.maxNodeId,
					this.reservedId,
					this.systemState,
				]),
			]);
		}
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return stripUndefined({
			...super.toJSON(),
			homeId: buffer2hex(this.homeId),
			nodeId: this.nodeId,
			lastNodeId: this.lastNodeId,
			staticControllerNodeId: this.staticControllerNodeId,
			sucLastIndex: this.sucLastIndex,
			controllerConfiguration: this.controllerConfiguration,
			sucAwarenessPushNeeded: this.sucAwarenessPushNeeded,
			maxNodeId: this.maxNodeId,
			reservedId: this.reservedId,
			systemState: this.systemState,
			lastNodeIdLR: this.lastNodeIdLR,
			maxNodeIdLR: this.maxNodeIdLR,
			reservedIdLR: this.reservedIdLR,
			primaryLongRangeChannelId: this.primaryLongRangeChannelId,
			dcdcConfig: this.dcdcConfig,
		});
	}
}
export const ControllerInfoFileID = getNVMFileIDStatic(ControllerInfoFile);
