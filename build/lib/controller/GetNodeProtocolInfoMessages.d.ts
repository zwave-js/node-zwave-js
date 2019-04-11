/// <reference types="node" />
import { Driver } from "../driver/Driver";
import { Message } from "../message/Message";
import { DeviceClass } from "../node/DeviceClass";
import { INodeQuery } from "../node/INodeQuery";
import { JSONObject } from "../util/misc";
export declare type Baudrate = 9600 | 40000 | 100000;
export declare class GetNodeProtocolInfoRequest extends Message implements INodeQuery {
    constructor(driver: Driver, nodeId?: number);
    nodeId: number;
    serialize(): Buffer;
    toJSON(): JSONObject;
}
export declare class GetNodeProtocolInfoResponse extends Message {
    private _isListening;
    readonly isListening: boolean;
    private _isFrequentListening;
    readonly isFrequentListening: boolean;
    private _isRouting;
    readonly isRouting: boolean;
    private _maxBaudRate;
    readonly maxBaudRate: Baudrate;
    private _isSecure;
    readonly isSecure: boolean;
    private _version;
    readonly version: number;
    private _isBeaming;
    readonly isBeaming: boolean;
    private _deviceClass;
    readonly deviceClass: DeviceClass;
    deserialize(data: Buffer): number;
    toJSON(): JSONObject;
}
