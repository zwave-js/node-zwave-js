import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export interface ProtocolNodeMaskFileOptions extends NVMFileCreationOptions {
    nodeIds: number[];
}
export declare class ProtocolNodeMaskFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | ProtocolNodeMaskFileOptions);
    nodeIds: number[];
    serialize(): NVM3Object;
    toJSON(): {
        "node IDs": string;
    };
}
export declare class ProtocolPreferredRepeatersFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolPreferredRepeatersFileID: number | ((id: number) => boolean);
export declare class ProtocolNodeListFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolNodeListFileID: number | ((id: number) => boolean);
export declare class ProtocolAppRouteLockNodeMaskFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolAppRouteLockNodeMaskFileID: number | ((id: number) => boolean);
export declare class ProtocolRouteSlaveSUCNodeMaskFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolRouteSlaveSUCNodeMaskFileID: number | ((id: number) => boolean);
export declare class ProtocolSUCPendingUpdateNodeMaskFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolSUCPendingUpdateNodeMaskFileID: number | ((id: number) => boolean);
export declare class ProtocolVirtualNodeMaskFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolVirtualNodeMaskFileID: number | ((id: number) => boolean);
export declare class ProtocolPendingDiscoveryNodeMaskFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolPendingDiscoveryNodeMaskFileID: number | ((id: number) => boolean);
export declare class ProtocolRouteCacheExistsNodeMaskFile extends ProtocolNodeMaskFile {
}
export declare const ProtocolRouteCacheExistsNodeMaskFileID: number | ((id: number) => boolean);
export declare class ProtocolLRNodeListFile extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | ProtocolNodeMaskFileOptions);
    nodeIds: number[];
    serialize(): NVM3Object;
    toJSON(): {
        payload: string;
        "node IDs": string;
    };
}
export declare const ProtocolLRNodeListFileID: number | ((id: number) => boolean);
//# sourceMappingURL=ProtocolNodeMaskFiles.d.ts.map