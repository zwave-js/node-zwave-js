import { CommandClasses } from "@zwave-js/core/safe";
import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export interface ApplicationCCsFileOptions extends NVMFileCreationOptions {
    includedInsecurely: CommandClasses[];
    includedSecurelyInsecureCCs: CommandClasses[];
    includedSecurelySecureCCs: CommandClasses[];
}
export declare class ApplicationCCsFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | ApplicationCCsFileOptions);
    includedInsecurely: CommandClasses[];
    includedSecurelyInsecureCCs: CommandClasses[];
    includedSecurelySecureCCs: CommandClasses[];
    serialize(): NVM3Object;
    toJSON(): {
        "included insecurely": string;
        "included securely (insecure)": string;
        "included securely (secure)": string;
    };
}
export declare const ApplicationCCsFileID: number | ((id: number) => boolean);
//# sourceMappingURL=ApplicationCCsFile.d.ts.map