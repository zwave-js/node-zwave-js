/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { MessageBaseOptions } from "@zwave-js/serial";
import { Message, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare enum FirmwareUpdateNVMCommand {
    Init = 0,
    SetNewImage = 1,
    GetNewImage = 2,
    UpdateCRC16 = 3,
    IsValidCRC16 = 4,
    Write = 5
}
export declare class FirmwareUpdateNVMRequest extends Message {
    constructor(host: ZWaveHost, options?: MessageOptions);
    command: FirmwareUpdateNVMCommand;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateNVMResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    command: FirmwareUpdateNVMCommand;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateNVM_InitRequest extends FirmwareUpdateNVMRequest {
}
export declare class FirmwareUpdateNVM_InitResponse extends FirmwareUpdateNVMResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly supported: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface FirmwareUpdateNVM_SetNewImageRequestOptions extends MessageBaseOptions {
    newImage: boolean;
}
export declare class FirmwareUpdateNVM_SetNewImageRequest extends FirmwareUpdateNVMRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | FirmwareUpdateNVM_SetNewImageRequestOptions);
    newImage: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateNVM_SetNewImageResponse extends FirmwareUpdateNVMResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly changed: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateNVM_GetNewImageRequest extends FirmwareUpdateNVMRequest {
}
export declare class FirmwareUpdateNVM_GetNewImageResponse extends FirmwareUpdateNVMResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly newImage: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface FirmwareUpdateNVM_UpdateCRC16RequestOptions extends MessageBaseOptions {
    crcSeed: number;
    offset: number;
    blockLength: number;
}
export declare class FirmwareUpdateNVM_UpdateCRC16Request extends FirmwareUpdateNVMRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | FirmwareUpdateNVM_UpdateCRC16RequestOptions);
    crcSeed: number;
    offset: number;
    blockLength: number;
    getResponseTimeout(): number | undefined;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateNVM_UpdateCRC16Response extends FirmwareUpdateNVMResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly crc16: number;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateNVM_IsValidCRC16Request extends FirmwareUpdateNVMRequest {
    getResponseTimeout(): number | undefined;
}
export declare class FirmwareUpdateNVM_IsValidCRC16Response extends FirmwareUpdateNVMResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly isValid: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface FirmwareUpdateNVM_WriteRequestOptions extends MessageBaseOptions {
    offset: number;
    buffer: Buffer;
}
export declare class FirmwareUpdateNVM_WriteRequest extends FirmwareUpdateNVMRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | FirmwareUpdateNVM_WriteRequestOptions);
    offset: number;
    buffer: Buffer;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class FirmwareUpdateNVM_WriteResponse extends FirmwareUpdateNVMResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly overwritten: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=FirmwareUpdateNVMMessages.d.ts.map