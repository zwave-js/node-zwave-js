/// <reference types="node" />
import { MessageOrCCLogEntry, TransmitStatus } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { INodeQuery, SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare class DeleteSUCReturnRouteRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export interface DeleteSUCReturnRouteRequestOptions extends MessageBaseOptions {
    nodeId: number;
}
export declare class DeleteSUCReturnRouteRequest extends DeleteSUCReturnRouteRequestBase implements INodeQuery {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | DeleteSUCReturnRouteRequestOptions);
    nodeId: number;
    serialize(): Buffer;
}
export declare class DeleteSUCReturnRouteResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly wasExecuted: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class DeleteSUCReturnRouteRequestTransmitReport extends DeleteSUCReturnRouteRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly transmitStatus: TransmitStatus;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=DeleteSUCReturnRouteMessages.d.ts.map