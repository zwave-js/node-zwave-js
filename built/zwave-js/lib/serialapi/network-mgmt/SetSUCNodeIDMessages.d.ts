/// <reference types="node" />
import { MessageOrCCLogEntry, TransmitOptions } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum SetSUCNodeIdStatus {
    Succeeded = 5,
    Failed = 6
}
export interface SetSUCNodeIdRequestOptions extends MessageBaseOptions {
    sucNodeId?: number;
    enableSUC: boolean;
    enableSIS: boolean;
    transmitOptions?: TransmitOptions;
}
export declare class SetSUCNodeIdRequestBase extends Message {
    constructor(host: ZWaveHost, options: MessageOptions);
}
export declare class SetSUCNodeIdRequest extends SetSUCNodeIdRequestBase {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SetSUCNodeIdRequestOptions);
    sucNodeId: number;
    enableSUC: boolean;
    enableSIS: boolean;
    transmitOptions: TransmitOptions;
    serialize(): Buffer;
    expectsCallback(): boolean;
}
export declare class SetSUCNodeIdResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    private _wasExecuted;
    get wasExecuted(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SetSUCNodeIdRequestStatusReport extends SetSUCNodeIdRequestBase implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    private _status;
    get status(): SetSUCNodeIdStatus;
    isOK(): boolean;
}
//# sourceMappingURL=SetSUCNodeIDMessages.d.ts.map