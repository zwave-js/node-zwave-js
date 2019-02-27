/// <reference types="node" />
import { Driver } from "../driver/Driver";
import { Message } from "../message/Message";
import { INodeQuery } from "./INodeQuery";
export declare class RequestNodeInfoRequest extends Message implements INodeQuery {
    constructor(driver: Driver, nodeId?: number);
    nodeId: number;
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
