/// <reference types="node" />
import { Message } from "../message/Message";
export declare const enum InitCapabilityFlags {
    Slave = 1,
    SupportsTimers = 2,
    Secondary = 4,
    SUC = 8
}
export declare class GetSerialApiInitDataRequest extends Message {
}
export declare class GetSerialApiInitDataResponse extends Message {
    private _initVersion;
    readonly initVersion: number;
    private _initCaps;
    readonly isSlave: boolean;
    readonly supportsTimers: boolean;
    readonly isSecondary: boolean;
    readonly isStaticUpdateController: boolean;
    private _nodeIds;
    readonly nodeIds: number[];
    deserialize(data: Buffer): number;
    toJSON(): Record<string, any>;
}
