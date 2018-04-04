/// <reference types="node" />
import { Message } from "../message/Message";
export declare class RequestNodeInfoRequest extends Message {
    nodeId: number;
    constructor(nodeId?: number);
    serialize(): Buffer;
    toJSON(): Record<string, any>;
}
export declare class RequestNodeInfoResponse extends Message {
    private _wasSent;
    readonly wasSent: boolean;
    private _errorCode;
    readonly errorCode: number;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
