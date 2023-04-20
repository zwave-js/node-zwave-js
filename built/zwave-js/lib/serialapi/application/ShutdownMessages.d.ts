import { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export interface ShutdownRequestOptions extends MessageBaseOptions {
    someProperty: number;
}
export declare class ShutdownRequest extends Message {
}
export declare class ShutdownResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly success: boolean;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=ShutdownMessages.d.ts.map