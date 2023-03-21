/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface ExtNVMWriteLongBufferRequestOptions extends MessageBaseOptions {
    offset: number;
    buffer: Buffer;
}
export declare class ExtNVMWriteLongBufferRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | ExtNVMWriteLongBufferRequestOptions);
    offset: number;
    buffer: Buffer;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class ExtNVMWriteLongBufferResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly success: boolean;
    isOK(): boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=ExtNVMWriteLongBufferMessages.d.ts.map