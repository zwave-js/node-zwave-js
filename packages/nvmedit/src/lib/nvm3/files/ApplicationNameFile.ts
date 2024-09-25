import { cpp2js } from "@zwave-js/shared";
import { type NVM3Object } from "../object";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile";

export interface ApplicationNameFileOptions extends NVMFileCreationOptions {
	name: string;
}

export const ApplicationNameFileID = 0x4100c;

@nvmFileID(ApplicationNameFileID)
@nvmSection("application")
export class ApplicationNameFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationNameFileOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.name = cpp2js(this.payload.toString("utf8"));
		} else {
			this.name = options.name;
		}
	}

	public name: string;

	public serialize(): NVM3Object & { data: Buffer } {
		// Return a zero-terminated string with a fixed length of 30 bytes
		const nameAsString = Buffer.from(this.name, "utf8");
		this.payload = Buffer.alloc(30, 0);
		nameAsString.subarray(0, this.payload.length - 1).copy(this.payload);
		return super.serialize();
	}
}
