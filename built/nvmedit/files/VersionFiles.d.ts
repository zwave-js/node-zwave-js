import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export interface VersionFileOptions extends NVMFileCreationOptions {
    format: number;
    major: number;
    minor: number;
    patch: number;
}
export declare class VersionFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | VersionFileOptions);
    format: number;
    major: number;
    minor: number;
    patch: number;
    serialize(): NVM3Object;
    toJSON(): {
        format: number;
        version: string;
    };
}
export declare class ApplicationVersionFile extends VersionFile {
}
export declare const ApplicationVersionFileID: number | ((id: number) => boolean);
export declare class ProtocolVersionFile extends VersionFile {
}
export declare const ProtocolVersionFileID: number | ((id: number) => boolean);
//# sourceMappingURL=VersionFiles.d.ts.map