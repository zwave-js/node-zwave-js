/// <reference types="node" />
import { CommandClasses } from "../commandclass/CommandClass";
import { Message } from "../message/Message";
import { BasicDeviceClasses, GenericDeviceClass, SpecificDeviceClass } from "../node/DeviceClass";
import { Driver } from "../driver/Driver";
export declare enum AddNodeType {
    Any = 1,
    Controller = 2,
    Slave = 3,
    Existing = 4,
    Stop = 5,
    StopFailed = 6
}
export declare enum AddNodeStatus {
    Ready = 1,
    NodeFound = 2,
    AddingSlave = 3,
    AddingController = 4,
    ProtocolDone = 5,
    Done = 6,
    Failed = 7
}
export declare class AddNodeToNetworkRequest extends Message {
    /** The type of node to add */
    addNodeType: AddNodeType;
    /** Whether to use high power */
    highPower?: boolean;
    /** Whether to include network wide */
    networkWide?: boolean;
    constructor(driver: Driver);
    constructor(driver: Driver, addNodeType?: AddNodeType, highPower?: boolean, networkWide?: boolean);
    private _status;
    readonly status: AddNodeStatus;
    private _statusContext;
    readonly statusContext: AddNodeStatusContext;
    serialize(): Buffer;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
export interface AddNodeStatusContext {
    nodeId: number;
    basic?: BasicDeviceClasses;
    generic?: GenericDeviceClass;
    specific?: SpecificDeviceClass;
    supportedCCs?: CommandClasses[];
    controlledCCs?: CommandClasses[];
}
