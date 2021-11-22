import type { NVMObject } from "../object";
import {
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

export interface ApplicationVersionFileOptions extends NVMFileCreationOptions {
	major: number;
	minor: number;
	patch: number;
}

@nvmFileID(0x51000)
export class ApplicationVersionFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationVersionFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.major = this.payload[2];
			this.minor = this.payload[1];
			this.patch = this.payload[0];
		} else {
			this.major = options.major;
			this.minor = options.minor;
			this.patch = options.patch;
		}
	}

	public major: number;
	public minor: number;
	public patch: number;

	public serialize(): NVMObject {
		this.payload = Buffer.from([this.patch, this.minor, this.major]);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			version: `${this.major}.${this.minor}.${this.patch}`,
		};
	}
}
