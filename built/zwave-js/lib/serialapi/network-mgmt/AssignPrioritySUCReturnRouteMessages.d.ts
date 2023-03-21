/// <reference types="node" />
import { MessageOrCCLogEntry, TransmitStatus, ZWaveDataRate } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions, SuccessIndicator } from "@zwave-js/serial";
export declare class AssignPrioritySUCReturnRouteRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export interface AssignPrioritySUCReturnRouteRequestOptions extends MessageBaseOptions {
    nodeId: number;
    repeaters: number[];
    routeSpeed: ZWaveDataRate;
}
export declare class AssignPrioritySUCReturnRouteRequest extends AssignPrioritySUCReturnRouteRequestBase {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | AssignPrioritySUCReturnRouteRequestOptions);
    nodeId: number;
    repeaters: number[];
    routeSpeed: ZWaveDataRate;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class AssignPrioritySUCReturnRouteResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly hasStarted: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class AssignPrioritySUCReturnRouteRequestTransmitReport extends AssignPrioritySUCReturnRouteRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly transmitStatus: TransmitStatus;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=AssignPrioritySUCReturnRouteMessages.d.ts.map