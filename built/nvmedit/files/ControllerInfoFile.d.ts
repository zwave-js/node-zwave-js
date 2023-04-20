/// <reference types="node" />
import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export type ControllerInfoFileOptions = NVMFileCreationOptions & {
    homeId: Buffer;
    nodeId: number;
    lastNodeId: number;
    staticControllerNodeId: number;
    sucLastIndex: number;
    controllerConfiguration: number;
    maxNodeId: number;
    reservedId: number;
    systemState: number;
} & ({
    sucAwarenessPushNeeded: number;
} | {
    lastNodeIdLR: number;
    maxNodeIdLR: number;
    reservedIdLR: number;
    primaryLongRangeChannelId: number;
    dcdcConfig: number;
});
export declare class ControllerInfoFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | ControllerInfoFileOptions);
    homeId: Buffer;
    nodeId: number;
    lastNodeId: number;
    staticControllerNodeId: number;
    sucLastIndex: number;
    controllerConfiguration: number;
    sucAwarenessPushNeeded?: number;
    maxNodeId: number;
    reservedId: number;
    systemState: number;
    lastNodeIdLR?: number;
    maxNodeIdLR?: number;
    reservedIdLR?: number;
    primaryLongRangeChannelId?: number;
    dcdcConfig?: number;
    serialize(): NVM3Object;
    toJSON(): Record<string, string | number | undefined>;
}
export declare const ControllerInfoFileID: number | ((id: number) => boolean);
//# sourceMappingURL=ControllerInfoFile.d.ts.map