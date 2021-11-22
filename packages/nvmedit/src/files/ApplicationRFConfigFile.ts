import type { NVMObject } from "../object";
import {
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
		} else {
			this.rfRegion = options.rfRegion;
			this.txPower = options.txPower;
			this.measured0dBm = options.measured0dBm;
		}
	}

	public rfRegion: number; // TODO: Should be RF Region
	public txPower: number;
	public measured0dBm: number;

	public serialize(): NVMObject {
		this.payload = Buffer.from([
			this.rfRegion,
			this.txPower * 10,
			this.measured0dBm * 10,
		]);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			"RF Region": this.rfRegion,
			"TX Power": `${this.txPower.toFixed(1)} dBm`,
			"Power @ 0dBm": `${this.measured0dBm.toFixed(1)} dBm`,
		};
	}
}
