/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
interface GetRoutingInfoRequestOptions extends MessageBaseOptions {
    nodeId: number;
    removeNonRepeaters?: boolean;
    removeBadLinks?: boolean;
}
export declare class GetRoutingInfoRequest extends Message {
    constructor(host: ZWaveHost, options: GetRoutingInfoRequestOptions);
    sourceNodeId: number;
    removeNonRepeaters: boolean;
    removeBadLinks: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class GetRoutingInfoResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    private _nodeIds;
    get nodeIds(): number[];
    toLogEntry(): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=GetRoutingInfoMessages.d.ts.map