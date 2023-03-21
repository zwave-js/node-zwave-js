/// <reference types="node" />
import { MessageOrCCLogEntry, TransmitStatus } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { INodeQuery, SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare class AssignReturnRouteRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export interface AssignReturnRouteRequestOptions extends MessageBaseOptions {
    nodeId: number;
    destinationNodeId: number;
}
export declare class AssignReturnRouteRequest extends AssignReturnRouteRequestBase implements INodeQuery {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | AssignReturnRouteRequestOptions);
    nodeId: number;
    destinationNodeId: number;
    serialize(): Buffer;
}
export declare class AssignReturnRouteResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly hasStarted: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class AssignReturnRouteRequestTransmitReport extends AssignReturnRouteRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly transmitStatus: TransmitStatus;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=AssignReturnRouteMessages.d.ts.map