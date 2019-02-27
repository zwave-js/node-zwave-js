/// <reference types="node" />
import { CommandClasses } from "../commandclass/CommandClass";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";
export interface EndpointInformation {
    generic: GenericDeviceClass;
    specific: SpecificDeviceClass;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
}
export interface NodeInformation extends EndpointInformation {
    nodeId: number;
    basic: BasicDeviceClasses;
}
export declare function parseNodeInformation(nif: Buffer): NodeInformation;
export declare function parseEndpointInformation(eif: Buffer): EndpointInformation;
