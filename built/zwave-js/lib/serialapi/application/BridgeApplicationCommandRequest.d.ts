import { CommandClass, ICommandClassContainer } from "@zwave-js/cc";
import { FrameType, MessageOrCCLogEntry, RSSI, SinglecastCC } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageDeserializationOptions } from "@zwave-js/serial";
export declare class BridgeApplicationCommandRequest extends Message implements ICommandClassContainer {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions);
    readonly routedBusy: boolean;
    readonly frameType: FrameType;
    readonly targetNodeId: number | number[];
    readonly isExploreFrame: boolean;
    readonly isForeignFrame: boolean;
    readonly fromForeignHomeId: boolean;
    readonly rssi?: RSSI;
    command: SinglecastCC<CommandClass>;
    getNodeId(): number | undefined;
    toLogEntry(): MessageOrCCLogEntry;
}
//# sourceMappingURL=BridgeApplicationCommandRequest.d.ts.map