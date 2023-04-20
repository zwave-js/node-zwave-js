/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { INodeQuery, Message, MessageBaseOptions, MessageDeserializationOptions, SuccessIndicator } from "@zwave-js/serial";
interface RequestNodeInfoResponseOptions extends MessageBaseOptions {
    wasSent: boolean;
}
export declare class RequestNodeInfoResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | RequestNodeInfoResponseOptions);
    wasSent: boolean;
    isOK(): boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
interface RequestNodeInfoRequestOptions extends MessageBaseOptions {
    nodeId: number;
}
export declare class RequestNodeInfoRequest extends Message implements INodeQuery {
    constructor(host: ZWaveHost, options: RequestNodeInfoRequestOptions | MessageDeserializationOptions);
    nodeId: number;
    needsCallbackId(): boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=RequestNodeInfoMessages.d.ts.map