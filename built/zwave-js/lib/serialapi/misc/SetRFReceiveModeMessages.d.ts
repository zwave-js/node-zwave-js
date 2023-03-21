/// <reference types="node" />
import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface SetRFReceiveModeRequestOptions extends MessageBaseOptions {
    /** Whether the stick should receive (true) or not (false) */
    enabled: boolean;
}
export declare class SetRFReceiveModeRequest extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | SetRFReceiveModeRequestOptions);
    enabled: boolean;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class SetRFReceiveModeResponse extends Message implements SuccessIndicator {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    isOK(): boolean;
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=SetRFReceiveModeMessages.d.ts.map