/// <reference types="node" />
import { MessageOrCCLogEntry, TransmitStatus, ZWaveDataRate } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions, SuccessIndicator } from "@zwave-js/serial";
export declare class AssignPriorityReturnRouteRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export interface AssignPriorityReturnRouteRequestOptions extends MessageBaseOptions {
    nodeId: number;
    destinationNodeId: number;
    repeaters: number[];
    routeSpeed: ZWaveDataRate;
}
export declare class AssignPriorityReturnRouteRequest extends AssignPriorityReturnRouteRequestBase {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | AssignPriorityReturnRouteRequestOptions);
    nodeId: number;
    destinationNodeId: number;
    repeaters: number[];
    routeSpeed: ZWaveDataRate;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class AssignPriorityReturnRouteResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly hasStarted: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class AssignPriorityReturnRouteRequestTransmitReport extends AssignPriorityReturnRouteRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly transmitStatus: TransmitStatus;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=AssignPriorityReturnRouteMessages.d.ts.map