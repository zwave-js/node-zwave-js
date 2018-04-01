/// <reference types="node" />
import { Message } from "../message/Message";
import { CommandClasses } from "../commandclass/CommandClass";
export declare enum TransmitOptions {
    NotSet = 0,
    ACK = 1,
    LowPower = 2,
    AutoRoute = 4,
    NoRoute = 16,
    Explore = 32,
    DEFAULT = 37,
}
export declare enum TransmitStatus {
    OK = 0,
    NoAck = 1,
    Fail = 2,
    NotIdle = 3,
    NoRoute = 4,
}
export declare class SendDataRequest extends Message {
    /** The ID of the node this request is addressed to/from */
    nodeId: number;
    /** The command this message contains */
    commandClass: CommandClasses;
    /** The payload for the command */
    ccPayload: Buffer;
    /** Options regarding the transmission of the message */
    transmitOptions: TransmitOptions;
    /** A callback ID to map requests and responses */
    callbackId: number;
    constructor();
    constructor(nodeId: number, commandClass: CommandClasses, ccPayload?: Buffer, transmitOptions?: TransmitOptions, callbackId?: number);
    serialize(): Buffer;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
export declare class SendDataResponse extends Message {
    private _wasSent;
    readonly wasSent: boolean;
    private _errorCode;
    readonly errorCode: number;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
