import { MessageOrCCLogEntry, RSSI } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageDeserializationOptions } from "@zwave-js/serial";
export declare class GetBackgroundRSSIRequest extends Message {
}
export declare class GetBackgroundRSSIResponse extends Message {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly rssiChannel0: RSSI;
    readonly rssiChannel1: RSSI;
    readonly rssiChannel2?: RSSI;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=GetBackgroundRSSIMessages.d.ts.map