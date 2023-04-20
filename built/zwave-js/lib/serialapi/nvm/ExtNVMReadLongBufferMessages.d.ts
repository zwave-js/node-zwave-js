/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface ExtNVMReadLongBufferRequestOptions extends MessageBaseOptions {
    offset: number;
    length: number;
}
export declare class ExtNVMReadLongBufferRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | ExtNVMReadLongBufferRequestOptions);
    offset: number;
    length: number;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class ExtNVMReadLongBufferResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly buffer: Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=ExtNVMReadLongBufferMessages.d.ts.map