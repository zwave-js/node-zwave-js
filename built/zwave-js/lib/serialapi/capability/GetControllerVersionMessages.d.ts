/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
import type { ZWaveLibraryTypes } from "../_Types";
export declare class GetControllerVersionRequest extends Message {
}
export interface GetControllerVersionResponseOptions extends MessageBaseOptions {
    controllerType: ZWaveLibraryTypes;
    libraryVersion: string;
}
export declare class GetControllerVersionResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetControllerVersionResponseOptions);
    controllerType: ZWaveLibraryTypes;
    libraryVersion: string;
    serialize(): Buffer;
}
//# sourceMappingURL=GetControllerVersionMessages.d.ts.map