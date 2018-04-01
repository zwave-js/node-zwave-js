/// <reference types="node" />
import { Message } from "../message/Message";
export declare enum AddNodeType {
    Any = 1,
    Controller = 2,
    Slave = 3,
    Existing = 4,
    Stop = 5,
    StopFailed = 6,
}
export declare class AddNodeToNetworkRequest extends Message {
    /** The type of node to add */
    addNodeType: AddNodeType;
    /** Whether to use high power */
    highPower: boolean;
    /** Whether to include network wide */
    networkWide: boolean;
    constructor();
    constructor(addNodeType?: AddNodeType, highPower?: boolean, networkWide?: boolean);
    serialize(): Buffer;
}
