import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile";

export interface ApplicationDataFileOptions extends NVMFileCreationOptions {
	applicationData: Buffer;
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
	public get applicationData(): Buffer {
		return this.payload;
	}
	public set applicationData(value: Buffer) {
		this.payload = value;
	}
}
