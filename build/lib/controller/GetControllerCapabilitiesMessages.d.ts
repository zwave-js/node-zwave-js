/// <reference types="node" />
import { Message } from "../message/Message";
import { JSONObject } from "../util/misc";
export declare class GetControllerCapabilitiesRequest extends Message {
}
export declare class GetControllerCapabilitiesResponse extends Message {
    private _capabilityFlags;
    readonly isSecondary: boolean;
    readonly isUsingHomeIdFromOtherNetwork: boolean;
    readonly isSISPresent: boolean;
    readonly wasRealPrimary: boolean;
    readonly isStaticUpdateController: boolean;
    deserialize(data: Buffer): number;
    toJSON(): JSONObject;
}
