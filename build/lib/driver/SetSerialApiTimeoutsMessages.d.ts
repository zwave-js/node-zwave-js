/// <reference types="node" />
import { Message } from "../message/Message";
export declare class SetSerialApiTimeoutsRequest extends Message {
    ackTimeout: number;
    byteTimeout: number;
    constructor();
    constructor(ackTimeout: number, byteTimeout: number);
    serialize(): Buffer;
    toJSON(): Record<string, any>;
}
export declare class SetSerialApiTimeoutsResponse extends Message {
    private _oldAckTimeout;
    readonly oldAckTimeout: number;
    private _oldByteTimeout;
    readonly oldByteTimeout: number;
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
