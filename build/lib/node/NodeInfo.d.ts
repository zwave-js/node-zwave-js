/// <reference types="node" />
import { CommandClasses } from "../commandclass/CommandClass";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "./DeviceClass";
export interface NodeInformation {
    nodeId: number;
    basic: BasicDeviceClasses;
    generic: GenericDeviceClass;
    specific: SpecificDeviceClass;
    supportedCCs: CommandClasses[];
    controlledCCs: CommandClasses[];
}
export declare function parseNodeInformation(nif: Buffer): NodeInformation;
