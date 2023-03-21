/// <reference types="node" />
import { MessageOrCCLogEntry, ZWaveDataRate } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions, SuccessIndicator } from "@zwave-js/serial";
export interface SetPriorityRouteRequestOptions extends MessageBaseOptions {
    destinationNodeId: number;
    repeaters: number[];
    routeSpeed: ZWaveDataRate;
}
export declare class SetPriorityRouteRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SetPriorityRouteRequestOptions);
    destinationNodeId: number;
    repeaters: number[];
    routeSpeed: ZWaveDataRate;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SetPriorityRouteResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=SetPriorityRouteMessages.d.ts.map