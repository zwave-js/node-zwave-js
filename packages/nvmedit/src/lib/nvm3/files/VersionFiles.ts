import { Bytes } from "@zwave-js/shared";
import type { NVM3Object } from "../object.js";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile.js";

export interface VersionFileOptions extends NVMFileCreationOptions {
	format: number;
	major: number;
	minor: number;
	patch: number;
}

export class VersionFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | VersionFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.format = this.payload[3];
			this.major = this.payload[2];
			this.minor = this.payload[1];
			this.patch = this.payload[0];
		} else {
			this.format = options.format;
			this.major = options.major;
			this.minor = options.minor;
			this.patch = options.patch;
		}
	}

	public format: number;
	public major: number;
	public minor: number;
	public patch: number;

	public serialize(): NVM3Object & { data: Bytes } {
		this.payload = Bytes.from([
			this.patch,
			this.minor,
			this.major,
			this.format,
		]);
		return super.serialize();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			...super.toJSON(),
			format: this.format,
			version: `${this.major}.${this.minor}.${this.patch}`,
		};
	}
}

export const ApplicationVersionFileID = 0x51000;

@nvmFileID(ApplicationVersionFileID)
@nvmSection("application")
export class ApplicationVersionFile extends VersionFile {}

// The 800 series has a shared application/protocol file system
// and uses a different ID for the application version file
export const ApplicationVersionFile800ID = 0x41000;

@nvmFileID(ApplicationVersionFile800ID)
@nvmSection("application")
export class ApplicationVersionFile800 extends VersionFile {}

export const ProtocolVersionFileID = 0x50000;

@nvmFileID(ProtocolVersionFileID)
@nvmSection("protocol")
export class ProtocolVersionFile extends VersionFile {}
