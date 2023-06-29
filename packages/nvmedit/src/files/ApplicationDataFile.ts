import {
	NVMFile,
	getNVMFileIDStatic,
	gotDeserializationOptions,
	nvmFileID,
	type NVMFileCreationOptions,
	type NVMFileDeserializationOptions,
} from "./NVMFile";

export interface ApplicationDataFileOptions extends NVMFileCreationOptions {
	data: Buffer;
}

@nvmFileID(200)
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
export const ApplicationDataFileID = getNVMFileIDStatic(ApplicationDataFile);
