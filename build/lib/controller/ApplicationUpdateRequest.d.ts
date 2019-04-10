/// <reference types="node" />
import { Message } from "../message/Message";
import { NodeUpdatePayload } from "../node/NodeInfo";
import { JSONObject } from "../util/misc";
export declare enum ApplicationUpdateTypes {
    NodeInfo_Received = 132,
    NodeInfo_RequestDone = 130,
    NodeInfo_RequestFailed = 129,
    RoutingPending = 128,
    NewIdAssigned = 64,
    DeleteDone = 32,
    SUC_IdChanged = 16
}
export declare class ApplicationUpdateRequest extends Message {
    private _updateType;
    readonly updateType: ApplicationUpdateTypes;
    private _nodeId;
    readonly nodeId: number;
    private _nodeInformation;
    readonly nodeInformation: NodeUpdatePayload;
    serialize(): Buffer;
    deserialize(data: Buffer): number;
    toJSON(): JSONObject;
}
