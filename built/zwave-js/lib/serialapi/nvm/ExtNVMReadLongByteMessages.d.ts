/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface ExtNVMReadLongByteRequestOptions extends MessageBaseOptions {
    offset: number;
}
export declare class ExtNVMReadLongByteRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | ExtNVMReadLongByteRequestOptions);
    offset: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class ExtNVMReadLongByteResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly byte: number;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=ExtNVMReadLongByteMessages.d.ts.map