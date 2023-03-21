/// <reference types="node" />
import type { MessageOrCCLogEntry } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageDeserializationOptions, MessageOptions } from "@zwave-js/serial";
export declare class HardResetRequestBase extends Message {
    constructor(host: ZWaveHost, options?: MessageOptions);
}
export declare class HardResetRequest extends HardResetRequestBase {
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export declare class HardResetCallback extends HardResetRequestBase {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=HardResetRequest.d.ts.map