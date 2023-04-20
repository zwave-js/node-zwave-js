/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export declare class GetSUCNodeIdRequest extends Message {
}
export interface GetSUCNodeIdResponseOptions extends MessageBaseOptions {
    sucNodeId: number;
}
export declare class GetSUCNodeIdResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetSUCNodeIdResponseOptions);
    /** The node id of the SUC or 0 if none is present */
    sucNodeId: number;
    serialize(): Buffer;
}
//# sourceMappingURL=GetSUCNodeIdMessages.d.ts.map