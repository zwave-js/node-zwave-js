import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export interface ApplicationTypeFileOptions extends NVMFileCreationOptions {
    isListening: boolean;
    optionalFunctionality: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number;
}
export declare class ApplicationTypeFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | ApplicationTypeFileOptions);
    isListening: boolean;
    optionalFunctionality: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number;
    serialize(): NVM3Object;
    toJSON(): {
        listening: boolean;
        "opt. functionality": boolean;
        genericDeviceClass: number;
        specificDeviceClass: number;
    };
}
export declare const ApplicationTypeFileID: number | ((id: number) => boolean);
//# sourceMappingURL=ApplicationTypeFile.d.ts.map