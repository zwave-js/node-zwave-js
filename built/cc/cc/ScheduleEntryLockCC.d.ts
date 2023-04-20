/// <reference types="node" />
import { CommandClasses, IZWaveEndpoint, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import { AllOrNone } from "@zwave-js/shared";
import { CCAPI } from "../lib/API";
import { CCCommandOptions, CommandClass, CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ScheduleEntryLockCommand, ScheduleEntryLockDailyRepeatingSchedule, ScheduleEntryLockSetAction, ScheduleEntryLockSlotId, ScheduleEntryLockWeekday, ScheduleEntryLockWeekDaySchedule, ScheduleEntryLockYearDaySchedule, Timezone } from "../lib/_Types";
export declare const ScheduleEntryLockCCValues: Readonly<{
    numDailyRepeatingSlots: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Schedule Entry Lock"];
            property: "numDailyRepeatingSlots";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Schedule Entry Lock"];
            readonly endpoint: number;
            readonly property: "numDailyRepeatingSlots";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    numYearDaySlots: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Schedule Entry Lock"];
            property: "numYearDaySlots";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Schedule Entry Lock"];
            readonly endpoint: number;
            readonly property: "numYearDaySlots";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    numWeekDaySlots: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Schedule Entry Lock"];
            property: "numWeekDaySlots";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Schedule Entry Lock"];
            readonly endpoint: number;
            readonly property: "numWeekDaySlots";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
}>;
export declare class ScheduleEntryLockCCAPI extends CCAPI {
    supportsCommand(cmd: ScheduleEntryLockCommand): Maybe<boolean>;
    /**
     * Enables or disables schedules. If a user ID is given, that user's
     * schedules will be enabled or disabled. If no user ID is given, all schedules
     * will be affected.
     */
    setEnabled(enabled: boolean, userId?: number): Promise<SupervisionResult | undefined>;
    getNumSlots(): Promise<Pick<ScheduleEntryLockCCSupportedReport, "numWeekDaySlots" | "numYearDaySlots" | "numDailyRepeatingSlots"> | undefined>;
    setWeekDaySchedule(slot: ScheduleEntryLockSlotId, schedule?: ScheduleEntryLockWeekDaySchedule): Promise<SupervisionResult | undefined>;
    getWeekDaySchedule(slot: ScheduleEntryLockSlotId): Promise<ScheduleEntryLockWeekDaySchedule | undefined>;
    setYearDaySchedule(slot: ScheduleEntryLockSlotId, schedule?: ScheduleEntryLockYearDaySchedule): Promise<SupervisionResult | undefined>;
    getYearDaySchedule(slot: ScheduleEntryLockSlotId): Promise<ScheduleEntryLockYearDaySchedule | undefined>;
    setDailyRepeatingSchedule(slot: ScheduleEntryLockSlotId, schedule?: ScheduleEntryLockDailyRepeatingSchedule): Promise<SupervisionResult | undefined>;
    getDailyRepeatingSchedule(slot: ScheduleEntryLockSlotId): Promise<ScheduleEntryLockDailyRepeatingSchedule | undefined>;
    getTimezone(): Promise<Timezone | undefined>;
    setTimezone(timezone: Timezone): Promise<SupervisionResult | undefined>;
}
export declare class ScheduleEntryLockCC extends CommandClass {
    ccCommand: ScheduleEntryLockCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    /**
     * Returns the number of supported day-of-week slots.
     * This only works AFTER the interview process
     */
    static getNumWeekDaySlotsCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number;
    /**
     * Returns the number of supported day-of-year slots.
     * This only works AFTER the interview process
     */
    static getNumYearDaySlotsCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number;
    /**
     * Returns the number of supported daily-repeating slots.
     * This only works AFTER the interview process
     */
    static getNumDailyRepeatingSlotsCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number;
}
interface ScheduleEntryLockCCEnableSetOptions extends CCCommandOptions {
    userId: number;
    enabled: boolean;
}
export declare class ScheduleEntryLockCCEnableSet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCEnableSetOptions);
    userId: number;
    enabled: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ScheduleEntryLockCCEnableAllSetOptions extends CCCommandOptions {
    enabled: boolean;
}
export declare class ScheduleEntryLockCCEnableAllSet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCEnableAllSetOptions);
    enabled: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ScheduleEntryLockCCSupportedReportOptions extends CCCommandOptions {
    numWeekDaySlots: number;
    numYearDaySlots: number;
    numDailyRepeatingSlots?: number;
}
export declare class ScheduleEntryLockCCSupportedReport extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCSupportedReportOptions);
    numWeekDaySlots: number;
    numYearDaySlots: number;
    numDailyRepeatingSlots: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ScheduleEntryLockCCSupportedGet extends ScheduleEntryLockCC {
}
/** @publicAPI */
export type ScheduleEntryLockCCWeekDayScheduleSetOptions = CCCommandOptions & ScheduleEntryLockSlotId & ({
    action: ScheduleEntryLockSetAction.Erase;
} | ({
    action: ScheduleEntryLockSetAction.Set;
} & ScheduleEntryLockWeekDaySchedule));
export declare class ScheduleEntryLockCCWeekDayScheduleSet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCWeekDayScheduleSetOptions);
    userId: number;
    slotId: number;
    action: ScheduleEntryLockSetAction;
    weekday?: ScheduleEntryLockWeekday;
    startHour?: number;
    startMinute?: number;
    stopHour?: number;
    stopMinute?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ScheduleEntryLockCCWeekDayScheduleReportOptions = CCCommandOptions & ScheduleEntryLockSlotId & AllOrNone<ScheduleEntryLockWeekDaySchedule>;
export declare class ScheduleEntryLockCCWeekDayScheduleReport extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCWeekDayScheduleReportOptions);
    userId: number;
    slotId: number;
    weekday?: ScheduleEntryLockWeekday;
    startHour?: number;
    startMinute?: number;
    stopHour?: number;
    stopMinute?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ScheduleEntryLockCCWeekDayScheduleGetOptions = CCCommandOptions & ScheduleEntryLockSlotId;
export declare class ScheduleEntryLockCCWeekDayScheduleGet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCWeekDayScheduleGetOptions);
    userId: number;
    slotId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
/** @publicAPI */
export type ScheduleEntryLockCCYearDayScheduleSetOptions = CCCommandOptions & ScheduleEntryLockSlotId & ({
    action: ScheduleEntryLockSetAction.Erase;
} | ({
    action: ScheduleEntryLockSetAction.Set;
} & ScheduleEntryLockYearDaySchedule));
export declare class ScheduleEntryLockCCYearDayScheduleSet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCYearDayScheduleSetOptions);
    userId: number;
    slotId: number;
    action: ScheduleEntryLockSetAction;
    startYear?: number;
    startMonth?: number;
    startDay?: number;
    startHour?: number;
    startMinute?: number;
    stopYear?: number;
    stopMonth?: number;
    stopDay?: number;
    stopHour?: number;
    stopMinute?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ScheduleEntryLockCCYearDayScheduleReportOptions = CCCommandOptions & ScheduleEntryLockSlotId & AllOrNone<ScheduleEntryLockYearDaySchedule>;
export declare class ScheduleEntryLockCCYearDayScheduleReport extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCYearDayScheduleReportOptions);
    userId: number;
    slotId: number;
    startYear?: number;
    startMonth?: number;
    startDay?: number;
    startHour?: number;
    startMinute?: number;
    stopYear?: number;
    stopMonth?: number;
    stopDay?: number;
    stopHour?: number;
    stopMinute?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ScheduleEntryLockCCYearDayScheduleGetOptions = CCCommandOptions & ScheduleEntryLockSlotId;
export declare class ScheduleEntryLockCCYearDayScheduleGet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCYearDayScheduleGetOptions);
    userId: number;
    slotId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ScheduleEntryLockCCTimeOffsetSetOptions extends CCCommandOptions {
    standardOffset: number;
    dstOffset: number;
}
export declare class ScheduleEntryLockCCTimeOffsetSet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCTimeOffsetSetOptions);
    standardOffset: number;
    dstOffset: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ScheduleEntryLockCCTimeOffsetReportOptions extends CCCommandOptions {
    standardOffset: number;
    dstOffset: number;
}
export declare class ScheduleEntryLockCCTimeOffsetReport extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCTimeOffsetReportOptions);
    standardOffset: number;
    dstOffset: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ScheduleEntryLockCCTimeOffsetGet extends ScheduleEntryLockCC {
}
/** @publicAPI */
export type ScheduleEntryLockCCDailyRepeatingScheduleSetOptions = CCCommandOptions & ScheduleEntryLockSlotId & ({
    action: ScheduleEntryLockSetAction.Erase;
} | ({
    action: ScheduleEntryLockSetAction.Set;
} & ScheduleEntryLockDailyRepeatingSchedule));
export declare class ScheduleEntryLockCCDailyRepeatingScheduleSet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCDailyRepeatingScheduleSetOptions);
    userId: number;
    slotId: number;
    action: ScheduleEntryLockSetAction;
    weekdays?: ScheduleEntryLockWeekday[];
    startHour?: number;
    startMinute?: number;
    durationHour?: number;
    durationMinute?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ScheduleEntryLockCCDailyRepeatingScheduleReportOptions = ScheduleEntryLockSlotId & AllOrNone<ScheduleEntryLockDailyRepeatingSchedule>;
export declare class ScheduleEntryLockCCDailyRepeatingScheduleReport extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & ScheduleEntryLockCCDailyRepeatingScheduleReportOptions));
    userId: number;
    slotId: number;
    weekdays?: ScheduleEntryLockWeekday[];
    startHour?: number;
    startMinute?: number;
    durationHour?: number;
    durationMinute?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type ScheduleEntryLockCCDailyRepeatingScheduleGetOptions = CCCommandOptions & ScheduleEntryLockSlotId;
export declare class ScheduleEntryLockCCDailyRepeatingScheduleGet extends ScheduleEntryLockCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ScheduleEntryLockCCDailyRepeatingScheduleGetOptions);
    userId: number;
    slotId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=ScheduleEntryLockCC.d.ts.map