/// <reference types="node" />
import type { Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ClockCommand, Weekday } from "../lib/_Types";
export declare class ClockCCAPI extends CCAPI {
    supportsCommand(cmd: ClockCommand): Maybe<boolean>;
    get(): Promise<Pick<ClockCCReport, "minute" | "hour" | "weekday"> | undefined>;
    set(hour: number, minute: number, weekday?: Weekday): Promise<SupervisionResult | undefined>;
}
export declare class ClockCC extends CommandClass {
    ccCommand: ClockCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface ClockCCSetOptions extends CCCommandOptions {
    weekday: Weekday;
    hour: number;
    minute: number;
}
export declare class ClockCCSet extends ClockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ClockCCSetOptions);
    weekday: Weekday;
    hour: number;
    minute: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ClockCCReport extends ClockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly weekday: Weekday;
    readonly hour: number;
    readonly minute: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ClockCCGet extends ClockCC {
}
export {};
//# sourceMappingURL=ClockCC.d.ts.map