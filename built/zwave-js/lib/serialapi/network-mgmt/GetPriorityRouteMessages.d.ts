/// <reference types="node" />
import { MessageOrCCLogEntry, ZWaveDataRate } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface GetPriorityRouteRequestOptions extends MessageBaseOptions {
    destinationNodeId: number;
}
export declare class GetPriorityRouteRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | GetPriorityRouteRequestOptions);
    destinationNodeId: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class GetPriorityRouteResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly destinationNodeId: number;
    readonly repeaters: number[];
    readonly routeSpeed: ZWaveDataRate;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=GetPriorityRouteMessages.d.ts.map