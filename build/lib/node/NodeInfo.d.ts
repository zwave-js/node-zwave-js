/// <reference types="node" />
import { CommandClasses } from "../commandclass/CommandClasses";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";
export interface NodeInformationFrame {
    generic: GenericDeviceClass;
    specific: SpecificDeviceClass;
    supportedCCs: CommandClasses[];
}
export interface ExtendedNodeInformationFrame extends NodeInformationFrame {
    controlledCCs: CommandClasses[];
}
export interface NodeUpdatePayload extends ExtendedNodeInformationFrame {
    nodeId: number;
    basic: BasicDeviceClasses;
}
export declare function parseNodeUpdatePayload(nif: Buffer): NodeUpdatePayload;
export declare function parseNodeInformationFrame(nif: Buffer): NodeInformationFrame;
