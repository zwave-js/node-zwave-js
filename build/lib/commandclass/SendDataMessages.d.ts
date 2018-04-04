/// <reference types="node" />
import { Message } from "../message/Message";
import { CommandClass } from "./CommandClass";
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
    /** The command this message contains */
    command: CommandClass;
    /** Options regarding the transmission of the message */
    transmitOptions: TransmitOptions;
    /** A callback ID to map requests and responses */
    callbackId: number;
    constructor();
    constructor(command: CommandClass, transmitOptions?: TransmitOptions, callbackId?: number);
    private _transmitStatus;
    readonly transmitStatus: TransmitStatus;
    serialize(): Buffer;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
    /** Checks if a received SendDataRequest indicates that sending failed */
    isFailed(): boolean;
}
export declare class SendDataResponse extends Message {
    private _wasSent;
    readonly wasSent: boolean;
    private _errorCode;
    readonly errorCode: number;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
