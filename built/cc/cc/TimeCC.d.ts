/// <reference types="node" />
import { DSTInfo, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { TimeCommand } from "../lib/_Types";
export declare class TimeCCAPI extends CCAPI {
    supportsCommand(cmd: TimeCommand): Maybe<boolean>;
    getTime(): Promise<Pick<TimeCCTimeReport, "minute" | "second" | "hour"> | undefined>;
    reportTime(hour: number, minute: number, second: number): Promise<SupervisionResult | undefined>;
    getDate(): Promise<Pick<TimeCCDateReport, "day" | "month" | "year"> | undefined>;
    reportDate(year: number, month: number, day: number): Promise<SupervisionResult | undefined>;
    setTimezone(timezone: DSTInfo): Promise<SupervisionResult | undefined>;
    getTimezone(): Promise<DSTInfo | undefined>;
    reportTimezone(timezone: DSTInfo): Promise<SupervisionResult | undefined>;
}
export declare class TimeCC extends CommandClass {
    ccCommand: TimeCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
interface TimeCCTimeReportOptions extends CCCommandOptions {
    hour: number;
    minute: number;
    second: number;
}
export declare class TimeCCTimeReport extends TimeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TimeCCTimeReportOptions);
    hour: number;
    minute: number;
    second: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class TimeCCTimeGet extends TimeCC {
}
interface TimeCCDateReportOptions extends CCCommandOptions {
    year: number;
    month: number;
    day: number;
}
export declare class TimeCCDateReport extends TimeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TimeCCDateReportOptions);
    year: number;
    month: number;
    day: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class TimeCCDateGet extends TimeCC {
}
interface TimeCCTimeOffsetSetOptions extends CCCommandOptions {
    standardOffset: number;
    dstOffset: number;
    dstStart: Date;
    dstEnd: Date;
}
export declare class TimeCCTimeOffsetSet extends TimeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TimeCCTimeOffsetSetOptions);
    standardOffset: number;
    dstOffset: number;
    dstStartDate: Date;
    dstEndDate: Date;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface TimeCCTimeOffsetReportOptions extends CCCommandOptions {
    standardOffset: number;
    dstOffset: number;
    dstStart: Date;
    dstEnd: Date;
}
export declare class TimeCCTimeOffsetReport extends TimeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | TimeCCTimeOffsetReportOptions);
    standardOffset: number;
    dstOffset: number;
    dstStartDate: Date;
    dstEndDate: Date;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class TimeCCTimeOffsetGet extends TimeCC {
}
export {};
//# sourceMappingURL=TimeCC.d.ts.map