/// <reference types="node" />
import { CommandClasses } from "@zwave-js/core/safe";
import { Route, SUCUpdateEntry } from "../files";
import { NVM500NodeInfo } from "./EntryParsers";
import { NVMEntryName, NVMLayout, ParsedNVMEntry } from "./shared";
export interface NVM500Details {
    name: string;
    library: "static" | "bridge";
    protocolVersions: string[];
    layout: NVMLayout;
}
export declare const nmvDetails500: readonly [NVM500Details, NVM500Details, NVM500Details, NVM500Details, NVM500Details, NVM500Details];
/** Detects which parser is able to parse the given NVM */
export declare function createParser(nvm: Buffer): NVMParser | undefined;
export declare class NVMParser {
    private readonly impl;
    constructor(impl: NVM500Details, nvm: Buffer);
    /** Tests if the given NVM is a valid NVM for this parser version */
    private isValid;
    private cache;
    private parse;
    private getOne;
    private getAll;
    toJSON(): Required<NVM500JSON>;
}
export declare class NVMSerializer {
    private readonly impl;
    constructor(impl: NVM500Details);
    readonly entries: Map<NVMEntryName, ParsedNVMEntry>;
    private nvmSize;
    private setOne;
    private setMany;
    private setFromNodeMap;
    private fill;
    parseJSON(json: Required<NVM500JSON>, protocolVersion: string): void;
    serialize(): Buffer;
}
export interface NVM500JSON {
    format: 500;
    meta?: NVM500Meta;
    controller: NVM500JSONController;
    nodes: Record<number, NVM500JSONNode>;
}
export interface NVM500Meta {
    manufacturerID: number;
    firmwareID: number;
    productType: number;
    productID: number;
    library: NVM500Details["library"];
}
export interface NVM500JSONController {
    protocolVersion: string;
    applicationVersion: string;
    ownHomeId: string;
    learnedHomeId?: string | null;
    nodeId: number;
    lastNodeId: number;
    staticControllerNodeId: number;
    sucLastIndex: number;
    controllerConfiguration: number;
    sucUpdateEntries: SUCUpdateEntry[];
    maxNodeId: number;
    reservedId: number;
    systemState: number;
    watchdogStarted: number;
    rfConfig: NVM500JSONControllerRFConfig;
    preferredRepeaters: number[];
    commandClasses: CommandClasses[];
    applicationData?: string | null;
}
export interface NVM500JSONControllerRFConfig {
    powerLevelNormal: number[];
    powerLevelLow: number[];
    powerMode: number;
    powerModeExtintEnable: number;
    powerModeWutTimeout: number;
}
export interface NVM500JSONNodeWithInfo extends NVM500NodeInfo {
    isVirtual: boolean;
    neighbors: number[];
    sucUpdateIndex: number;
    appRouteLock: boolean;
    routeSlaveSUC: boolean;
    sucPendingUpdate: boolean;
    pendingDiscovery: boolean;
    lwr?: Route | null;
    nlwr?: Route | null;
}
export interface NVM500JSONVirtualNode {
    isVirtual: true;
}
export type NVM500JSONNode = NVM500JSONNodeWithInfo | NVM500JSONVirtualNode;
//# sourceMappingURL=NVMParser.d.ts.map