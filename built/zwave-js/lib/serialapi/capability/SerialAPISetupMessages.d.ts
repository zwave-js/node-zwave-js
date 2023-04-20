/// <reference types="node" />
import { MessageOrCCLogEntry, RFRegion } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
import { NodeIDType } from "../_Types";
export declare enum SerialAPISetupCommand {
    Unsupported = 0,
    GetSupportedCommands = 1,
    SetTxStatusReport = 2,
    SetPowerlevel = 4,
    GetPowerlevel = 8,
    GetMaximumPayloadSize = 16,
    GetRFRegion = 32,
    SetRFRegion = 64,
    SetNodeIDType = 128,
    SetLRMaximumTxPower = 3,
    GetLRMaximumTxPower = 5,
    GetLRMaximumPayloadSize = 17,
    SetPowerlevel16Bit = 18,
    GetPowerlevel16Bit = 19
}
export declare class SerialAPISetupRequest extends Message {
    constructor(host: ZWaveHost, options?: MessageOptions);
    command: SerialAPISetupCommand;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetupResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    command: SerialAPISetupCommand;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_CommandUnsupportedResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_GetSupportedCommandsRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class SerialAPISetup_GetSupportedCommandsResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly supportedCommands: SerialAPISetupCommand[];
}
export interface SerialAPISetup_SetTXStatusReportOptions extends MessageBaseOptions {
    enabled: boolean;
}
export declare class SerialAPISetup_SetTXStatusReportRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SerialAPISetup_SetTXStatusReportOptions);
    enabled: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_SetTXStatusReportResponse extends SerialAPISetupResponse implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface SerialAPISetup_SetNodeIDTypeOptions extends MessageBaseOptions {
    nodeIdType: NodeIDType;
}
export declare class SerialAPISetup_SetNodeIDTypeRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SerialAPISetup_SetNodeIDTypeOptions);
    nodeIdType: NodeIDType;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_SetNodeIDTypeResponse extends SerialAPISetupResponse implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_GetRFRegionRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class SerialAPISetup_GetRFRegionResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly region: RFRegion;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface SerialAPISetup_SetRFRegionOptions extends MessageBaseOptions {
    region: RFRegion;
}
export declare class SerialAPISetup_SetRFRegionRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SerialAPISetup_SetRFRegionOptions);
    region: RFRegion;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_SetRFRegionResponse extends SerialAPISetupResponse implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_GetPowerlevelRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class SerialAPISetup_GetPowerlevelResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    /** The configured normal powerlevel in dBm */
    readonly powerlevel: number;
    /** The measured output power in dBm for a normal output powerlevel of 0 */
    readonly measured0dBm: number;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface SerialAPISetup_SetPowerlevelOptions extends MessageBaseOptions {
    powerlevel: number;
    measured0dBm: number;
}
export declare class SerialAPISetup_SetPowerlevelRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SerialAPISetup_SetPowerlevelOptions);
    powerlevel: number;
    measured0dBm: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_SetPowerlevelResponse extends SerialAPISetupResponse implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_GetPowerlevel16BitRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class SerialAPISetup_GetPowerlevel16BitResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    /** The configured normal powerlevel in dBm */
    readonly powerlevel: number;
    /** The measured output power in dBm for a normal output powerlevel of 0 */
    readonly measured0dBm: number;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface SerialAPISetup_SetPowerlevel16BitOptions extends MessageBaseOptions {
    powerlevel: number;
    measured0dBm: number;
}
export declare class SerialAPISetup_SetPowerlevel16BitRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SerialAPISetup_SetPowerlevel16BitOptions);
    powerlevel: number;
    measured0dBm: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_SetPowerlevel16BitResponse extends SerialAPISetupResponse implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_GetLRMaximumTxPowerRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class SerialAPISetup_GetLRMaximumTxPowerResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    /** The maximum LR TX power dBm */
    readonly limit: number;
    toLogEntry(): MessageOrCCLogEntry;
}
export interface SerialAPISetup_SetLRMaximumTxPowerOptions extends MessageBaseOptions {
    limit: number;
}
export declare class SerialAPISetup_SetLRMaximumTxPowerRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SerialAPISetup_SetLRMaximumTxPowerOptions);
    limit: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_SetLRMaximumTxPowerResponse extends SerialAPISetupResponse implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_GetMaximumPayloadSizeRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class SerialAPISetup_GetMaximumPayloadSizeResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly maxPayloadSize: number;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SerialAPISetup_GetLRMaximumPayloadSizeRequest extends SerialAPISetupRequest {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class SerialAPISetup_GetLRMaximumPayloadSizeResponse extends SerialAPISetupResponse {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly maxPayloadSize: number;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=SerialAPISetupMessages.d.ts.map