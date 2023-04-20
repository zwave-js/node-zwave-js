/// <reference types="node" />
import { MessageOrCCLogEntry, TransmitStatus } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { INodeQuery, SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare class DeleteReturnRouteRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export interface DeleteReturnRouteRequestOptions extends MessageBaseOptions {
    nodeId: number;
}
export declare class DeleteReturnRouteRequest extends DeleteReturnRouteRequestBase implements INodeQuery {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | DeleteReturnRouteRequestOptions);
    nodeId: number;
    serialize(): Buffer;
}
export declare class DeleteReturnRouteResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly hasStarted: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class DeleteReturnRouteRequestTransmitReport extends DeleteReturnRouteRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly transmitStatus: TransmitStatus;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=DeleteReturnRouteMessages.d.ts.map