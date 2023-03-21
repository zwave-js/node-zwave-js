import { RFRegion } from "@zwave-js/core/safe";
import { AllOrNone } from "@zwave-js/shared/safe";
import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export type ApplicationRFConfigFileOptions = NVMFileCreationOptions & {
    rfRegion: RFRegion;
    txPower: number;
    measured0dBm: number;
} & AllOrNone<{
    enablePTI?: number;
    maxTXPower?: number;
}>;
export declare class ApplicationRFConfigFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | ApplicationRFConfigFileOptions);
    rfRegion: RFRegion;
    txPower: number;
    measured0dBm: number;
    enablePTI?: number;
    maxTXPower?: number;
    serialize(): NVM3Object;
    toJSON(): Record<string, any>;
}
export declare const ApplicationRFConfigFileID: number | ((id: number) => boolean);
//# sourceMappingURL=ApplicationRFConfigFile.d.ts.map