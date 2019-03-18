/// <reference types="node" />
import { IDriver } from "../driver/IDriver";
import { Message } from "../message/Message";
export declare class GetRoutingInfoRequest extends Message {
    nodeId?: number;
    removeNonRepeaters?: boolean;
    removeBadLinks?: boolean;
    constructor(driver: IDriver);
    constructor(driver: IDriver, nodeId: number, removeNonRepeaters: boolean, removeBadLinks: boolean);
    serialize(): Buffer;
    toJSON(): Record<string, any>;
}
export declare class GetRoutingInfoResponse extends Message {
    private _nodeIds;
    readonly nodeIds: number[];
    deserialize(data: Buffer): number;
}
