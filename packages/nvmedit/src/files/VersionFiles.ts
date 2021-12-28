import type { NVM3Object } from "../nvm3/object";
import {
	getNVMFileIDStatic,
	gotDeserializationOptions,
	NVMFile,
	NVMFileCreationOptions,
	NVMFileDeserializationOptions,
	nvmFileID,
} from "./NVMFile";

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

	public serialize(): NVM3Object {
		this.payload = Buffer.from([
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

@nvmFileID(0x51000)
export class ApplicationVersionFile extends VersionFile {}
export const ApplicationVersionFileID = getNVMFileIDStatic(
	ApplicationVersionFile,
);

@nvmFileID(0x50000)
export class ProtocolVersionFile extends VersionFile {}
export const ProtocolVersionFileID = getNVMFileIDStatic(ProtocolVersionFile);
