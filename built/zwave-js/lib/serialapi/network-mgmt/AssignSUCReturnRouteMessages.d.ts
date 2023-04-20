/// <reference types="node" />
import { MessageOrCCLogEntry, TransmitStatus } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { INodeQuery, Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions, SuccessIndicator } from "@zwave-js/serial";
export declare class AssignSUCReturnRouteRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export interface AssignSUCReturnRouteRequestOptions extends MessageBaseOptions {
    nodeId: number;
}
export declare class AssignSUCReturnRouteRequest extends AssignSUCReturnRouteRequestBase implements INodeQuery {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | AssignSUCReturnRouteRequestOptions);
    nodeId: number;
    serialize(): Buffer;
}
interface AssignSUCReturnRouteResponseOptions extends MessageBaseOptions {
    wasExecuted: boolean;
}
export declare class AssignSUCReturnRouteResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | AssignSUCReturnRouteResponseOptions);
    isOK(): boolean;
    wasExecuted: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
interface AssignSUCReturnRouteRequestTransmitReportOptions extends MessageBaseOptions {
    transmitStatus: TransmitStatus;
    callbackId: number;
}
export declare class AssignSUCReturnRouteRequestTransmitReport extends AssignSUCReturnRouteRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | AssignSUCReturnRouteRequestTransmitReportOptions);
    isOK(): boolean;
    transmitStatus: TransmitStatus;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=AssignSUCReturnRouteMessages.d.ts.map