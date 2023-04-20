/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface ExtNVMWriteLongByteRequestOptions extends MessageBaseOptions {
    offset: number;
    byte: number;
}
export declare class ExtNVMWriteLongByteRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | ExtNVMWriteLongByteRequestOptions);
    offset: number;
    byte: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class ExtNVMWriteLongByteResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly success: boolean;
    isOK(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=ExtNVMWriteLongByteMessages.d.ts.map