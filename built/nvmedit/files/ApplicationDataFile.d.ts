/// <reference types="node" />
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export interface ApplicationDataFileOptions extends NVMFileCreationOptions {
    data: Buffer;
}
export declare class ApplicationDataFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | ApplicationDataFileOptions);
    get data(): Buffer;
    set data(value: Buffer);
}
export declare const ApplicationDataFileID: number | ((id: number) => boolean);
//# sourceMappingURL=ApplicationDataFile.d.ts.map