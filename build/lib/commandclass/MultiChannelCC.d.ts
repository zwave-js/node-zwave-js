/// <reference types="node" />
import { GenericDeviceClasses } from "../node/DeviceClass";
import { EndpointInformation } from "../node/NodeInfo";
import { CommandClass } from "./CommandClass";
export declare enum MultiChannelCommand {
    EndPointGet = 7,
    EndPointReport = 8,
    CapabilityGet = 9,
    CapabilityReport = 10,
    EndPointFind = 11,
    EndPointFindReport = 12,
    CommandEncapsulation = 13
}
export interface EndpointCapability extends EndpointInformation {
    isDynamic: boolean;
}
export declare class MultiChannelCC extends CommandClass {
    nodeId: number;
    ccCommand?: MultiChannelCommand;
    constructor(nodeId?: number);
    constructor(nodeId: number, ccCommand: MultiChannelCommand.EndPointGet);
    constructor(nodeId: number, ccCommand: MultiChannelCommand.CapabilityGet, endpoint: number);
    constructor(nodeId: number, ccCommand: MultiChannelCommand.EndPointFind, genericClass: GenericDeviceClasses, specificClass: number);
    private _isDynamicEndpointCount;
    readonly isDynamicEndpointCount: boolean;
    private _identicalCapabilities;
    readonly identicalCapabilities: boolean;
    private _endpointCount;
    readonly endpointCount: number;
    private _endpointCapabilities;
    readonly endpointCapabilities: Map<number, EndpointCapability>;
    endpoint: number;
    genericClass: GenericDeviceClasses;
    specificClass: number;
    private _foundEndpoints;
    readonly foundEndpoints: number[];
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
