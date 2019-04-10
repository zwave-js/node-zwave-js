/// <reference types="node" />
import { Message } from "../message/Message";
import { JSONObject } from "../util/misc";
export declare class GetSUCNodeIdRequest extends Message {
}
export declare class GetSUCNodeIdResponse extends Message {
    private _sucNodeId;
    /** The node id of the SUC or 0 if none is present */
    readonly sucNodeId: number;
    deserialize(data: Buffer): number;
    toJSON(): JSONObject;
}
