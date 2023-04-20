/// <reference types="node" />
import { CommandClasses, DataRate, FLiRS, NodeInformationFrame, NodeProtocolInfoAndDeviceClass, NodeType, ProtocolVersion, ZWaveDataRate } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { NetworkTransferStatus, WakeUpTime, ZWaveProtocolCommand } from "../lib/_Types";
export declare class ZWaveProtocolCC extends CommandClass {
    ccCommand: ZWaveProtocolCommand;
}
interface ZWaveProtocolCCNodeInformationFrameOptions extends CCCommandOptions, NodeInformationFrame {
}
export declare class ZWaveProtocolCCNodeInformationFrame extends ZWaveProtocolCC implements NodeInformationFrame {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCNodeInformationFrameOptions);
    basicDeviceClass: number;
    genericDeviceClass: number;
    specificDeviceClass: number;
    isListening: boolean;
    isFrequentListening: FLiRS;
    isRouting: boolean;
    supportedDataRates: DataRate[];
    protocolVersion: ProtocolVersion;
    optionalFunctionality: boolean;
    nodeType: NodeType;
    supportsSecurity: boolean;
    supportsBeaming: boolean;
    supportedCCs: CommandClasses[];
    serialize(): Buffer;
}
export declare class ZWaveProtocolCCRequestNodeInformationFrame extends ZWaveProtocolCC {
}
interface ZWaveProtocolCCAssignIDsOptions extends CCCommandOptions {
    nodeId: number;
    homeId: number;
}
export declare class ZWaveProtocolCCAssignIDs extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCAssignIDsOptions);
    nodeId: number;
    homeId: number;
    serialize(): Buffer;
}
interface ZWaveProtocolCCFindNodesInRangeOptions extends CCCommandOptions {
    candidateNodeIds: number[];
    wakeUpTime: WakeUpTime;
    dataRate?: ZWaveDataRate;
}
export declare class ZWaveProtocolCCFindNodesInRange extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCFindNodesInRangeOptions);
    candidateNodeIds: number[];
    wakeUpTime: WakeUpTime;
    dataRate: ZWaveDataRate;
    serialize(): Buffer;
}
interface ZWaveProtocolCCRangeInfoOptions extends CCCommandOptions {
    neighborNodeIds: number[];
    wakeUpTime?: WakeUpTime;
}
export declare class ZWaveProtocolCCRangeInfo extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCRangeInfoOptions);
    neighborNodeIds: number[];
    wakeUpTime?: WakeUpTime;
    serialize(): Buffer;
}
export declare class ZWaveProtocolCCGetNodesInRange extends ZWaveProtocolCC {
}
interface ZWaveProtocolCCCommandCompleteOptions extends CCCommandOptions {
    sequenceNumber: number;
}
export declare class ZWaveProtocolCCCommandComplete extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCCommandCompleteOptions);
    sequenceNumber: number;
    serialize(): Buffer;
}
interface ZWaveProtocolCCTransferPresentationOptions extends CCCommandOptions {
    supportsNWI: boolean;
    includeNode: boolean;
    excludeNode: boolean;
}
export declare class ZWaveProtocolCCTransferPresentation extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCTransferPresentationOptions);
    supportsNWI: boolean;
    includeNode: boolean;
    excludeNode: boolean;
    serialize(): Buffer;
}
interface ZWaveProtocolCCTransferNodeInformationOptions extends CCCommandOptions, NodeProtocolInfoAndDeviceClass {
    sequenceNumber: number;
    nodeId: number;
}
export declare class ZWaveProtocolCCTransferNodeInformation extends ZWaveProtocolCC implements NodeProtocolInfoAndDeviceClass {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCTransferNodeInformationOptions);
    sequenceNumber: number;
    nodeId: number;
    basicDeviceClass: number;
    genericDeviceClass: number;
    specificDeviceClass: number;
    isListening: boolean;
    isFrequentListening: FLiRS;
    isRouting: boolean;
    supportedDataRates: DataRate[];
    protocolVersion: ProtocolVersion;
    optionalFunctionality: boolean;
    nodeType: NodeType;
    supportsSecurity: boolean;
    supportsBeaming: boolean;
    serialize(): Buffer;
}
interface ZWaveProtocolCCTransferRangeInformationOptions extends CCCommandOptions {
    sequenceNumber: number;
    nodeId: number;
    neighborNodeIds: number[];
}
export declare class ZWaveProtocolCCTransferRangeInformation extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCTransferRangeInformationOptions);
    sequenceNumber: number;
    nodeId: number;
    neighborNodeIds: number[];
    serialize(): Buffer;
}
interface ZWaveProtocolCCTransferEndOptions extends CCCommandOptions {
    status: NetworkTransferStatus;
}
export declare class ZWaveProtocolCCTransferEnd extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCTransferEndOptions);
    status: NetworkTransferStatus;
    serialize(): Buffer;
}
interface ZWaveProtocolCCAssignReturnRouteOptions extends CCCommandOptions {
    nodeId: number;
    routeIndex: number;
    repeaters: number[];
    destinationWakeUp: WakeUpTime;
    destinationSpeed: ZWaveDataRate;
}
export declare class ZWaveProtocolCCAssignReturnRoute extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCAssignReturnRouteOptions);
    nodeId: number;
    routeIndex: number;
    repeaters: number[];
    destinationWakeUp: WakeUpTime;
    destinationSpeed: ZWaveDataRate;
    serialize(): Buffer;
}
interface ZWaveProtocolCCNewNodeRegisteredOptions extends CCCommandOptions, NodeInformationFrame {
    nodeId: number;
}
export declare class ZWaveProtocolCCNewNodeRegistered extends ZWaveProtocolCC implements NodeInformationFrame {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCNewNodeRegisteredOptions);
    nodeId: number;
    basicDeviceClass: number;
    genericDeviceClass: number;
    specificDeviceClass: number;
    isListening: boolean;
    isFrequentListening: FLiRS;
    isRouting: boolean;
    supportedDataRates: DataRate[];
    protocolVersion: ProtocolVersion;
    optionalFunctionality: boolean;
    nodeType: NodeType;
    supportsSecurity: boolean;
    supportsBeaming: boolean;
    supportedCCs: CommandClasses[];
    serialize(): Buffer;
}
interface ZWaveProtocolCCNewRangeRegisteredOptions extends CCCommandOptions {
    nodeId: number;
    neighborNodeIds: number[];
}
export declare class ZWaveProtocolCCNewRangeRegistered extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCNewRangeRegisteredOptions);
    nodeId: number;
    neighborNodeIds: number[];
    serialize(): Buffer;
}
interface ZWaveProtocolCCTransferNewPrimaryControllerCompleteOptions extends CCCommandOptions {
    genericDeviceClass: number;
}
export declare class ZWaveProtocolCCTransferNewPrimaryControllerComplete extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCTransferNewPrimaryControllerCompleteOptions);
    genericDeviceClass: number;
    serialize(): Buffer;
}
export declare class ZWaveProtocolCCAutomaticControllerUpdateStart extends ZWaveProtocolCC {
}
interface ZWaveProtocolCCSUCNodeIDOptions extends CCCommandOptions {
    sucNodeId: number;
    isSIS: boolean;
}
export declare class ZWaveProtocolCCSUCNodeID extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCSUCNodeIDOptions);
    sucNodeId: number;
    isSIS: boolean;
    serialize(): Buffer;
}
interface ZWaveProtocolCCSetSUCOptions extends CCCommandOptions {
    enableSIS: boolean;
}
export declare class ZWaveProtocolCCSetSUC extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCSetSUCOptions);
    enableSIS: boolean;
    serialize(): Buffer;
}
interface ZWaveProtocolCCSetSUCAckOptions extends CCCommandOptions {
    accepted: boolean;
    isSIS: boolean;
}
export declare class ZWaveProtocolCCSetSUCAck extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCSetSUCAckOptions);
    accepted: boolean;
    isSIS: boolean;
    serialize(): Buffer;
}
export declare class ZWaveProtocolCCAssignSUCReturnRoute extends ZWaveProtocolCCAssignReturnRoute {
}
interface ZWaveProtocolCCStaticRouteRequestOptions extends CCCommandOptions {
    nodeIds: number[];
}
export declare class ZWaveProtocolCCStaticRouteRequest extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCStaticRouteRequestOptions);
    nodeIds: number[];
    serialize(): Buffer;
}
interface ZWaveProtocolCCLostOptions extends CCCommandOptions {
    nodeId: number;
}
export declare class ZWaveProtocolCCLost extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCLostOptions);
    nodeId: number;
    serialize(): Buffer;
}
interface ZWaveProtocolCCAcceptLostOptions extends CCCommandOptions {
    accepted: boolean;
}
export declare class ZWaveProtocolCCAcceptLost extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCAcceptLostOptions);
    accepted: boolean;
    serialize(): Buffer;
}
interface ZWaveProtocolCCNOPPowerOptions extends CCCommandOptions {
    powerDampening: number;
}
export declare class ZWaveProtocolCCNOPPower extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCNOPPowerOptions);
    powerDampening: number;
    serialize(): Buffer;
}
interface ZWaveProtocolCCReservedIDsOptions extends CCCommandOptions {
    reservedNodeIDs: number[];
}
export declare class ZWaveProtocolCCReservedIDs extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCReservedIDsOptions);
    reservedNodeIDs: number[];
    serialize(): Buffer;
}
interface ZWaveProtocolCCReserveNodeIDsOptions extends CCCommandOptions {
    numNodeIDs: number;
}
export declare class ZWaveProtocolCCReserveNodeIDs extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCReserveNodeIDsOptions);
    numNodeIDs: number;
    serialize(): Buffer;
}
interface ZWaveProtocolCCNodesExistReplyOptions extends CCCommandOptions {
    nodeMaskType: number;
    nodeListUpdated: boolean;
}
export declare class ZWaveProtocolCCNodesExistReply extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCNodesExistReplyOptions);
    nodeMaskType: number;
    nodeListUpdated: boolean;
    serialize(): Buffer;
}
interface ZWaveProtocolCCNodesExistOptions extends CCCommandOptions {
    nodeMaskType: number;
    nodeIDs: number[];
}
export declare class ZWaveProtocolCCNodesExist extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCNodesExistOptions);
    nodeMaskType: number;
    nodeIDs: number[];
    serialize(): Buffer;
}
interface ZWaveProtocolCCSetNWIModeOptions extends CCCommandOptions {
    enabled: boolean;
    timeoutMinutes?: number;
}
export declare class ZWaveProtocolCCSetNWIMode extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCSetNWIModeOptions);
    enabled: boolean;
    timeoutMinutes?: number;
    serialize(): Buffer;
}
export declare class ZWaveProtocolCCExcludeRequest extends ZWaveProtocolCCNodeInformationFrame {
}
interface ZWaveProtocolCCAssignReturnRoutePriorityOptions extends CCCommandOptions {
    targetNodeId: number;
    routeNumber: number;
}
export declare class ZWaveProtocolCCAssignReturnRoutePriority extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCAssignReturnRoutePriorityOptions);
    targetNodeId: number;
    routeNumber: number;
    serialize(): Buffer;
}
export declare class ZWaveProtocolCCAssignSUCReturnRoutePriority extends ZWaveProtocolCCAssignReturnRoutePriority {
}
interface ZWaveProtocolCCSmartStartIncludedNodeInformationOptions extends CCCommandOptions {
    nwiHomeId: Buffer;
}
export declare class ZWaveProtocolCCSmartStartIncludedNodeInformation extends ZWaveProtocolCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ZWaveProtocolCCSmartStartIncludedNodeInformationOptions);
    nwiHomeId: Buffer;
    serialize(): Buffer;
}
export declare class ZWaveProtocolCCSmartStartPrime extends ZWaveProtocolCCNodeInformationFrame {
}
export declare class ZWaveProtocolCCSmartStartInclusionRequest extends ZWaveProtocolCCNodeInformationFrame {
}
export {};
//# sourceMappingURL=ZWaveProtocolCC.d.ts.map