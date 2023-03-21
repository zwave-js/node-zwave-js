/// <reference types="node" />
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface IsFailedNodeRequestOptions extends MessageBaseOptions {
    failedNodeId: number;
}
export declare class IsFailedNodeRequest extends Message {
    constructor(host: ZWaveHost, options: IsFailedNodeRequestOptions);
    failedNodeId: number;
    serialize(): Buffer;
}
export declare class IsFailedNodeResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly result: boolean;
}
//# sourceMappingURL=IsFailedNodeMessages.d.ts.map