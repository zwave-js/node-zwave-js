import { NodeProtocolInfo } from "@zwave-js/core/safe";
import type { NVM3Object } from "../nvm3/object";
import { NVMFile, NVMFileCreationOptions, NVMFileDeserializationOptions } from "./NVMFile";
export declare const NODEINFOS_PER_FILE_V1 = 4;
export interface NodeInfo extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
    nodeId: number;
    genericDeviceClass: number;
    specificDeviceClass?: number | null;
    neighbors: number[];
    sucUpdateIndex: number;
}
export interface NodeInfoFileV0Options extends NVMFileCreationOptions {
    nodeInfo: NodeInfo;
}
export declare const NodeInfoFileV0IDBase = 327936;
export declare function nodeIdToNodeInfoFileIDV0(nodeId: number): number;
export declare class NodeInfoFileV0 extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | NodeInfoFileV0Options);
    nodeInfo: NodeInfo;
    serialize(): NVM3Object;
    toJSON(): {
        nodeInfo: NodeInfo;
    };
}
export interface NodeInfoFileV1Options extends NVMFileCreationOptions {
    nodeInfos: NodeInfo[];
}
export declare const NodeInfoFileV1IDBase = 328192;
export declare function nodeIdToNodeInfoFileIDV1(nodeId: number): number;
export declare class NodeInfoFileV1 extends NVMFile {
    constructor(options: NVMFileDeserializationOptions | NodeInfoFileV1Options);
    nodeInfos: NodeInfo[];
    serialize(): NVM3Object;
    toJSON(): {
        "node infos": NodeInfo[];
    };
}
//# sourceMappingURL=NodeInfoFiles.d.ts.map