import { getNVMFileIDStatic, NVMFile, nvmFileID } from "./NVMFile";

@nvmFileID(200)
export class ApplicationDataFile extends NVMFile {
	// Just binary data
	public get data(): Buffer {
		return this.payload;
	}
}
export const ApplicationDataFileID = getNVMFileIDStatic(ApplicationDataFile);
