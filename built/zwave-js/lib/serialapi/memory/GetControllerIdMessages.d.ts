/// <reference types="node" />
import type { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export declare class GetControllerIdRequest extends Message {
}
export interface GetControllerIdResponseOptions extends MessageBaseOptions {
    homeId: number;
    ownNodeId: number;
}
export declare class GetControllerIdResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetControllerIdResponseOptions);
    homeId: number;
    ownNodeId: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=GetControllerIdMessages.d.ts.map