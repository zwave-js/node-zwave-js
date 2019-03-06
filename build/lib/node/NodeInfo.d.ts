/// <reference types="node" />
import { CommandClasses } from "../commandclass/CommandClass";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";
export interface NodeInformationFrame {
    generic: GenericDeviceClass;
    specific: SpecificDeviceClass;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
}
export interface NodeUpdatePayload extends NodeInformationFrame {
    nodeId: number;
    basic: BasicDeviceClasses;
}
export declare function parseNodeUpdatePayload(nif: Buffer): NodeUpdatePayload;
export declare function parseNodeInformationFrame(nif: Buffer): NodeInformationFrame;
