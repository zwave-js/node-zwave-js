/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ClimateControlScheduleCommand, ScheduleOverrideType, SetbackState, Switchpoint, Weekday } from "../lib/_Types";
export declare const ClimateControlScheduleCCValues: Readonly<{
    schedule: ((weekday: Weekday) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Climate Control Schedule"];
            readonly endpoint: number;
            readonly property: "schedule";
            readonly propertyKey: Weekday;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Climate Control Schedule"];
            property: "schedule";
            propertyKey: Weekday;
        };
        readonly meta: {
            readonly label: `Schedule (${string})`;
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    overrideState: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Climate Control Schedule"];
            property: "overrideState";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Climate Control Schedule"];
            readonly endpoint: number;
            readonly property: "overrideState";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Override state";
            readonly min: -12.8;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    overrideType: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Climate Control Schedule"];
            property: "overrideType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Climate Control Schedule"];
            readonly endpoint: number;
            readonly property: "overrideType";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Override type";
            readonly states: {
                [x: number]: string;
            };
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
}>;
export declare class ClimateControlScheduleCCAPI extends CCAPI {
    supportsCommand(cmd: ClimateControlScheduleCommand): Maybe<boolean>;
    set(weekday: Weekday, switchPoints: Switchpoint[]): Promise<SupervisionResult | undefined>;
    get(weekday: Weekday): Promise<readonly Switchpoint[] | undefined>;
    getChangeCounter(): Promise<number | undefined>;
    getOverride(): Promise<{
        type: ScheduleOverrideType;
        state: SetbackState;
    } | undefined>;
    setOverride(type: ScheduleOverrideType, state: SetbackState): Promise<SupervisionResult | undefined>;
}
export declare class ClimateControlScheduleCC extends CommandClass {
    ccCommand: ClimateControlScheduleCommand;
}
interface ClimateControlScheduleCCSetOptions extends CCCommandOptions {
    weekday: Weekday;
    switchPoints: Switchpoint[];
}
export declare class ClimateControlScheduleCCSet extends ClimateControlScheduleCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ClimateControlScheduleCCSetOptions);
    switchPoints: Switchpoint[];
    weekday: Weekday;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ClimateControlScheduleCCReport extends ClimateControlScheduleCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly weekday: Weekday;
    readonly schedule: readonly Switchpoint[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ClimateControlScheduleCCGetOptions extends CCCommandOptions {
    weekday: Weekday;
}
export declare class ClimateControlScheduleCCGet extends ClimateControlScheduleCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ClimateControlScheduleCCGetOptions);
    weekday: Weekday;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ClimateControlScheduleCCChangedReport extends ClimateControlScheduleCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly changeCounter: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ClimateControlScheduleCCChangedGet extends ClimateControlScheduleCC {
}
export declare class ClimateControlScheduleCCOverrideReport extends ClimateControlScheduleCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly overrideType: ScheduleOverrideType;
    readonly overrideState: SetbackState;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ClimateControlScheduleCCOverrideGet extends ClimateControlScheduleCC {
}
interface ClimateControlScheduleCCOverrideSetOptions extends CCCommandOptions {
    overrideType: ScheduleOverrideType;
    overrideState: SetbackState;
}
export declare class ClimateControlScheduleCCOverrideSet extends ClimateControlScheduleCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ClimateControlScheduleCCOverrideSetOptions);
    overrideType: ScheduleOverrideType;
    overrideState: SetbackState;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=ClimateControlScheduleCC.d.ts.map