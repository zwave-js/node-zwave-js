import {
	NVMFile,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
	gotDeserializationOptions,
	nvmFileID,
	nvmSection,
} from "./NVMFile";

export interface ApplicationDataFileOptions extends NVMFileCreationOptions {
	data: Buffer;
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
			this.payload = options.data;
		}
	}

	// Just binary data
	public get data(): Buffer {
		return this.payload;
	}
	public set data(value: Buffer) {
		this.payload = value;
	}
}
