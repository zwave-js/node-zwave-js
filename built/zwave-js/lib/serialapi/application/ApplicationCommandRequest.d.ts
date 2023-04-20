/// <reference types="node" />
import { CommandClass, ICommandClassContainer } from "@zwave-js/cc";
import { FrameType, MessageOrCCLogEntry, SinglecastCC } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import { Message, MessageBaseOptions, MessageDeserializationOptions } from "@zwave-js/serial";
export declare enum ApplicationCommandStatusFlags {
    RoutedBusy = 1,
    LowPower = 2,
    TypeSingle = 0,
    TypeBroad = 4,
    TypeMulti = 8,
    TypeMask = 12,
    Explore = 16,
    ForeignFrame = 64,
    ForeignHomeId = 128
}
interface ApplicationCommandRequestOptions extends MessageBaseOptions {
    command: CommandClass;
    frameType?: ApplicationCommandRequest["frameType"];
    routedBusy?: boolean;
}
export declare class ApplicationCommandRequest extends Message implements ICommandClassContainer {
    constructor(host: ZWaveHost, options: MessageDeserializationOptions | ApplicationCommandRequestOptions);
    readonly routedBusy: boolean;
    readonly frameType: FrameType;
    readonly isExploreFrame: boolean;
    readonly isForeignFrame: boolean;
    readonly fromForeignHomeId: boolean;
    command: SinglecastCC<CommandClass>;
    getNodeId(): number | undefined;
    serialize(): Buffer;
    toLogEntry(): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=ApplicationCommandRequest.d.ts.map