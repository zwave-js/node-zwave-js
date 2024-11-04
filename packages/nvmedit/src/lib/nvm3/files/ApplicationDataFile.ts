import { type Bytes } from "@zwave-js/shared/safe";
import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile.js";

export interface ApplicationDataFileOptions extends NVMFileCreationOptions {
	applicationData: Bytes;
}

export const ApplicationDataFileID = 200;

@nvmFileID(ApplicationDataFileID)
@nvmSection("application")
export class ApplicationDataFile extends NVMFile {
	public constructor(
		options: NVMFileDeserializationOptions | ApplicationDataFileOptions,
	) {
		super(options);
		if (!gotDeserializationOptions(options)) {
			this.payload = options.applicationData;
		}
	}

	// Just binary data
	public get applicationData(): Bytes {
		return this.payload;
	}
	public set applicationData(value: Bytes) {
		this.payload = value;
	}
}
