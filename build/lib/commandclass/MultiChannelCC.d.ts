/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { GenericDeviceClasses } from "../node/DeviceClass";
import { NodeInformationFrame } from "../node/NodeInfo";
import { CommandClass } from "./CommandClass";
export declare enum MultiChannelCommand {
    EndPointGet = 7,
    EndPointReport = 8,
    CapabilityGet = 9,
    CapabilityReport = 10,
    EndPointFind = 11,
    EndPointFindReport = 12,
    CommandEncapsulation = 13,
    AggregatedMembersGet = 14,
    AggregatedMembersReport = 15
}
export interface EndpointCapability extends NodeInformationFrame {
    isDynamic: boolean;
}
export declare class MultiChannelCC extends CommandClass {
    nodeId: number;
    ccCommand?: MultiChannelCommand;
    constructor(driver: IDriver, nodeId?: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultiChannelCommand.EndPointGet);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultiChannelCommand.CapabilityGet | MultiChannelCommand.AggregatedMembersGet, endpoint: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultiChannelCommand.EndPointFind, genericClass: GenericDeviceClasses, specificClass: number);
    constructor(driver: IDriver, nodeId: number, ccCommand: MultiChannelCommand.CommandEncapsulation, encapsulatedCC: CommandClass);
    isDynamicEndpointCount: boolean;
    identicalCapabilities: boolean;
    individualEndpointCount: number;
    aggregatedEndpointCount: number;
    private _endpointCapabilities;
    readonly endpointCapabilities: Map<number, EndpointCapability>;
    endpoint: number;
    genericClass: GenericDeviceClasses;
    specificClass: number;
    private _foundEndpoints;
    readonly foundEndpoints: number[];
    sourceEndPoint: number;
    /** The destination end point (0-127) or an array of destination end points (1-7) */
    destination: number | number[];
    encapsulatedCC: CommandClass;
    private _aggregatedEndpointMembers;
    readonly aggregatedEndpointMembers: number[];
    serialize(): Buffer;
    deserialize(data: Buffer): void;
}
