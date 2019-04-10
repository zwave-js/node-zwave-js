/// <reference types="node" />
import { Driver } from "../driver/Driver";
import { Message } from "../message/Message";
import { JSONObject } from "../util/misc";
export declare class SetSerialApiTimeoutsRequest extends Message {
    ackTimeout?: number;
    byteTimeout?: number;
    constructor(driver: Driver);
    constructor(driver: Driver, ackTimeout: number, byteTimeout: number);
    serialize(): Buffer;
    toJSON(): JSONObject;
}
export declare class SetSerialApiTimeoutsResponse extends Message {
    private _oldAckTimeout;
    readonly oldAckTimeout: number;
    private _oldByteTimeout;
    readonly oldByteTimeout: number;
    deserialize(data: Buffer): number;
    toJSON(): JSONObject;
}
