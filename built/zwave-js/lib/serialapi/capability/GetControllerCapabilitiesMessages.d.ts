/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export declare class GetControllerCapabilitiesRequest extends Message {
}
export interface GetControllerCapabilitiesResponseOptions extends MessageBaseOptions {
    isSecondary: boolean;
    isUsingHomeIdFromOtherNetwork: boolean;
    isSISPresent: boolean;
    wasRealPrimary: boolean;
    isStaticUpdateController: boolean;
}
export declare class GetControllerCapabilitiesResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetControllerCapabilitiesResponseOptions);
    isSecondary: boolean;
    isUsingHomeIdFromOtherNetwork: boolean;
    isSISPresent: boolean;
    wasRealPrimary: boolean;
    isStaticUpdateController: boolean;
    serialize(): Buffer;
}
//# sourceMappingURL=GetControllerCapabilitiesMessages.d.ts.map