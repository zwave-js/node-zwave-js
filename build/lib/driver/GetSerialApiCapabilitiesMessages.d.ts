/// <reference types="node" />
import { Message } from "../message/Message";
export declare class GetSerialApiCapabilitiesRequest extends Message {
}
export declare class GetSerialApiCapabilitiesResponse extends Message {
    private _serialApiVersion;
    readonly serialApiVersion: string;
    private _manufacturerId;
    readonly manufacturerId: number;
    private _productType;
    readonly productType: number;
    private _productId;
    readonly productId: number;
    private _functionBitMask;
    readonly functionBitMask: Buffer;
    deserialize(data: Buffer): number;
}
