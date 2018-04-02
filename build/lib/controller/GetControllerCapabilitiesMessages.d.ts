/// <reference types="node" />
import { Message } from "../message/Message";
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
    toJSON(): Record<string, any>;
}
