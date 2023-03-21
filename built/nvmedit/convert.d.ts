/// <reference types="node" />
import { CommandClasses, NodeProtocolInfo, RFRegion } from "@zwave-js/core/safe";
import semver from "semver";
import { Route, SUCUpdateEntry } from "./files";
import { NVM3Objects, NVMMeta } from "./nvm3/nvm";
import type { NVM3Object } from "./nvm3/object";
import { NVM500JSON } from "./nvm500/NVMParser";
export interface NVMJSON {
    format: number;
    meta?: NVMMeta;
    controller: NVMJSONController;
    nodes: Record<number, NVMJSONNode>;
}
export interface NVMJSONController {
    protocolVersion: string;
    applicationVersion: string;
    homeId: string;
    nodeId: number;
    lastNodeId: number;
    staticControllerNodeId: number;
    sucLastIndex: number;
    controllerConfiguration: number;
    sucUpdateEntries: SUCUpdateEntry[];
    sucAwarenessPushNeeded?: number | null;
    maxNodeId: number;
    reservedId: number;
    systemState: number;
    lastNodeIdLR?: number | null;
    maxNodeIdLR?: number | null;
    reservedIdLR?: number | null;
    primaryLongRangeChannelId?: number | null;
    dcdcConfig?: number | null;
    rfConfig?: NVMJSONControllerRFConfig | null;
    preferredRepeaters?: number[] | null;
    isListening: boolean;
    optionalFunctionality: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number;
    commandClasses: {
        includedInsecurely: CommandClasses[];
        includedSecurelyInsecureCCs: CommandClasses[];
        includedSecurelySecureCCs: CommandClasses[];
    };
    applicationData?: string | null;
}
export interface NVMJSONControllerRFConfig {
    rfRegion: RFRegion;
    txPower: number;
    measured0dBm: number;
    enablePTI: number | null;
    maxTXPower: number | null;
}
export interface NVMJSONNodeWithInfo extends Omit<NodeProtocolInfo, "hasSpecificDeviceClass"> {
    isVirtual: boolean;
    genericDeviceClass: number;
    specificDeviceClass: number | null;
    neighbors: number[];
    sucUpdateIndex: number;
    appRouteLock: boolean;
    routeSlaveSUC: boolean;
    sucPendingUpdate: boolean;
    pendingDiscovery: boolean;
    lwr?: Route | null;
    nlwr?: Route | null;
}
export interface NVMJSONVirtualNode {
    isVirtual: true;
}
export type NVMJSONNode = NVMJSONNodeWithInfo | NVMJSONVirtualNode;
export declare function nodeHasInfo(node: NVMJSONNode): node is NVMJSONNodeWithInfo;
/** Converts a compressed set of NVM objects to a JSON representation */
export declare function nvmObjectsToJSON(applicationObjects: ReadonlyMap<number, NVM3Object>, protocolObjects: ReadonlyMap<number, NVM3Object>): NVMJSON;
export declare function jsonToNVMObjects_v7_0_0(json: NVMJSON, targetSDKVersion: semver.SemVer): NVM3Objects;
export declare function jsonToNVMObjects_v7_11_0(json: NVMJSON, targetSDKVersion: semver.SemVer): NVM3Objects;
/** Reads an NVM buffer and returns its JSON representation */
export declare function nvmToJSON(buffer: Buffer, debugLogs?: boolean): Required<NVMJSON>;
/** Reads an NVM buffer of a 500-series stick and returns its JSON representation */
export declare function nvm500ToJSON(buffer: Buffer): Required<NVM500JSON>;
/** Takes a JSON represented NVM and converts it to binary */
export declare function jsonToNVM(json: Required<NVMJSON>, targetSDKVersion: string): Buffer;
/** Takes a JSON represented 500 series NVM and converts it to binary */
export declare function jsonToNVM500(json: Required<NVM500JSON>, protocolVersion: string): Buffer;
export declare function json500To700(json: NVM500JSON, truncateApplicationData?: boolean): NVMJSON;
export declare function json700To500(json: NVMJSON): NVM500JSON;
/** Converts the given source NVM into a format that is compatible with the given target NVM */
export declare function migrateNVM(sourceNVM: Buffer, targetNVM: Buffer): Buffer;
//# sourceMappingURL=convert.d.ts.map