/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum NVMOperationsCommand {
    Open = 0,
    Read = 1,
    Write = 2,
    Close = 3
}
export declare enum NVMOperationStatus {
    OK = 0,
    Error = 1,
    Error_OperationMismatch = 2,
    Error_OperationInterference = 3,
    EndOfFile = 255
}
export declare class NVMOperationsRequest extends Message {
    command: NVMOperationsCommand;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class NVMOperationsOpenRequest extends NVMOperationsRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class NVMOperationsCloseRequest extends NVMOperationsRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export interface NVMOperationsReadRequestOptions extends MessageBaseOptions {
    length: number;
    offset: number;
}
export declare class NVMOperationsReadRequest extends NVMOperationsRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | NVMOperationsReadRequestOptions);
    length: number;
    offset: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface NVMOperationsWriteRequestOptions extends MessageBaseOptions {
    offset: number;
    buffer: Buffer;
}
export declare class NVMOperationsWriteRequest extends NVMOperationsRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | NVMOperationsWriteRequestOptions);
    offset: number;
    buffer: Buffer;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class NVMOperationsResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly status: NVMOperationStatus;
    readonly offsetOrSize: number;
    readonly buffer: Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=NVMOperationsMessages.d.ts.map