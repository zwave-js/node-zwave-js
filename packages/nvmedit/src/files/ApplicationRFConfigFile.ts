import type { NVM3Object } from "../nvm3/object";
import {
	getNVMFileIDStatic,
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export interface ApplicationRFConfigFileOptions extends NVMFileCreationOptions {
	rfRegion: number; // TODO: Should be RF Region
	txPower: number;
	measured0dBm: number;
	enablePTI?: number;
	maxTXPower?: number;
}

@nvmFileID(104)
export class ApplicationRFConfigFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationRFConfigFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.rfRegion = this.payload[0];
			this.txPower = this.payload[1] / 10;
			this.measured0dBm = this.payload[2] / 10;
			if (this.payload.length >= 5) {
				this.enablePTI = this.payload[3];
				this.maxTXPower = this.payload.readInt16LE(4) / 10;
			}
		} else {
			this.rfRegion = options.rfRegion;
			this.txPower = options.txPower;
			this.measured0dBm = options.measured0dBm;
			this.enablePTI = options.enablePTI;
			this.maxTXPower = options.maxTXPower;
		}
	}

	public rfRegion: number; // TODO: Should be RF Region
	public txPower: number;
	public measured0dBm: number;
	public enablePTI?: number;
	public maxTXPower?: number;

	public serialize(): NVM3Object {
		this.payload = Buffer.from([
			this.rfRegion,
			this.txPower * 10,
			this.measured0dBm * 10,
		]);
		if (this.enablePTI != undefined || this.maxTXPower != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				Buffer.from([this.enablePTI ?? 0, 0, 0]),
			]);
			if (this.maxTXPower != undefined) {
				this.payload.writeInt16LE(this.maxTXPower * 10, 4);
			}
		}
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		const ret: Record<string, any> = {
			...super.toJSON(),
			"RF Region": this.rfRegion,
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
