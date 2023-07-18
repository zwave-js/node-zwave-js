import { RFRegion, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core/safe";
import { getEnumMemberName, type AllOrNone } from "@zwave-js/shared/safe";
import semver from "semver";
import type { NVM3Object } from "../nvm3/object";
import {
	NVMFile,
	getNVMFileIDStatic,
	gotDeserializationOptions,
	nvmFileID,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
} from "./NVMFile";

export type ApplicationRFConfigFileOptions = NVMFileCreationOptions & {
	rfRegion: RFRegion;
	txPower: number;
	measured0dBm: number;
} & AllOrNone<{
		enablePTI?: number;
		maxTXPower?: number;
	}>;

@nvmFileID(104)
export class ApplicationRFConfigFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationRFConfigFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			if (this.payload.length === 3 || this.payload.length === 6) {
				this.rfRegion = this.payload[0];
				this.txPower = this.payload.readIntLE(1, 1) / 10;
				this.measured0dBm = this.payload.readIntLE(2, 1) / 10;
				if (this.payload.length === 6) {
					this.enablePTI = this.payload[3];
					this.maxTXPower = this.payload.readInt16LE(4) / 10;
				}
			} else if (this.payload.length === 8) {
				this.rfRegion = this.payload[0];
				this.txPower = this.payload.readInt16LE(1) / 10;
				this.measured0dBm = this.payload.readInt16LE(3) / 10;
				this.enablePTI = this.payload[5];
				this.maxTXPower = this.payload.readInt16LE(6) / 10;
			} else {
				throw new ZWaveError(
					`ApplicationRFConfigFile has unsupported length ${this.payload.length}`,
					ZWaveErrorCodes.NVM_NotSupported,
				);
			}
		} else {
			this.rfRegion = options.rfRegion;
			this.txPower = options.txPower;
			this.measured0dBm = options.measured0dBm;
			this.enablePTI = options.enablePTI;
			this.maxTXPower = options.maxTXPower;
		}
	}

	public rfRegion: RFRegion;
	public txPower: number;
	public measured0dBm: number;
	public enablePTI?: number;
	public maxTXPower?: number;

	public serialize(): NVM3Object {
		if (semver.lt(this.fileVersion, "7.18.1")) {
			this.payload = Buffer.alloc(
				semver.gte(this.fileVersion, "7.15.3") ? 6 : 3,
				0,
			);
			this.payload[0] = this.rfRegion;
			this.payload.writeIntLE(this.txPower * 10, 1, 1);
			this.payload.writeIntLE(this.measured0dBm * 10, 2, 1);
			if (semver.gte(this.fileVersion, "7.15.3")) {
				this.payload[3] = this.enablePTI ?? 0;
				this.payload.writeInt16LE((this.maxTXPower ?? 0) * 10, 4);
			}
		} else {
			this.payload = Buffer.alloc(8, 0);
			this.payload[0] = this.rfRegion;
			this.payload.writeInt16LE(this.txPower * 10, 1);
			this.payload.writeInt16LE(this.measured0dBm * 10, 3);
			this.payload[5] = this.enablePTI ?? 0;
			this.payload.writeInt16LE((this.maxTXPower ?? 0) * 10, 6);
		}
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		const ret: Record<string, any> = {
			...super.toJSON(),
			"RF Region": getEnumMemberName(RFRegion, this.rfRegion),
			"TX Power": `${this.txPower.toFixed(1)} dBm`,
			"Power @ 0dBm": `${this.measured0dBm.toFixed(1)} dBm`,
		};
		if (this.enablePTI != undefined) {
			ret["enable PTI"] = this.enablePTI;
		}
		if (this.maxTXPower != undefined) {
			ret["max TX power"] = `${this.maxTXPower.toFixed(1)} dBm`;
		}
		return ret;
	}
}
export const ApplicationRFConfigFileID = getNVMFileIDStatic(
	ApplicationRFConfigFile,
);
