/// <reference types="node" />
import { MeterScale } from "@zwave-js/config";
import type { MessageOrCCLogEntry, SinglecastCC, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses, Maybe } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { MeterCommand, RateType } from "../lib/_Types";
export declare const MeterCCValues: Readonly<{
    value: ((meterType: number, rateType: RateType, scale: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Meter;
            readonly endpoint: number;
            readonly property: "value";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: CommandClasses.Meter;
            property: "value";
            propertyKey: number;
        };
        readonly meta: {
            readonly ccSpecific: {
                readonly meterType: number;
                readonly rateType: RateType;
                readonly scale: number;
            };
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    resetSingle: ((meterType: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Meter;
            readonly endpoint: number;
            readonly property: "reset";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: CommandClasses.Meter;
            property: "reset";
            propertyKey: number;
        };
        readonly meta: {
            readonly label: `Reset (${string})`;
            readonly ccSpecific: {
                readonly meterType: number;
            };
            readonly readable: false;
            readonly type: "boolean";
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    resetAll: {
        readonly id: {
            commandClass: CommandClasses.Meter;
            property: "reset";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Meter;
            readonly endpoint: number;
            readonly property: "reset";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Reset accumulated values";
            readonly readable: false;
            readonly type: "boolean";
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
    supportedRateTypes: {
        readonly id: {
            commandClass: CommandClasses.Meter;
            property: "supportedRateTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Meter;
            readonly endpoint: number;
            readonly property: "supportedRateTypes";
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
    supportedScales: {
        readonly id: {
            commandClass: CommandClasses.Meter;
            property: "supportedScales";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Meter;
            readonly endpoint: number;
            readonly property: "supportedScales";
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
    supportsReset: {
        readonly id: {
            commandClass: CommandClasses.Meter;
            property: "supportsReset";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Meter;
            readonly endpoint: number;
            readonly property: "supportsReset";
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
    type: {
        readonly id: {
            commandClass: CommandClasses.Meter;
            property: "type";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Meter;
            readonly endpoint: number;
            readonly property: "type";
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
export declare class MeterCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: MeterCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    get(options?: MeterCCGetOptions): Promise<{
        value: number;
        rateType: RateType;
        previousValue: number | undefined;
        deltaTime: Maybe<number>;
        type: number;
        scale: MeterScale;
    } | undefined>;
    getAll(): Promise<{
        value: number;
        rateType: RateType;
        previousValue: number | undefined;
        deltaTime: Maybe<number>;
        type: number;
        scale: MeterScale;
    }[]>;
    getSupported(): Promise<Pick<MeterCCSupportedReport, "type" | "supportsReset" | "supportedScales" | "supportedRateTypes"> | undefined>;
    reset(options?: MeterCCResetOptions): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
}
export declare class MeterCC extends CommandClass {
    ccCommand: MeterCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    shouldRefreshValues(this: SinglecastCC<this>, applHost: ZWaveApplicationHost): boolean;
    translatePropertyKey(applHost: ZWaveApplicationHost, property: string | number, propertyKey: string | number): string | undefined;
}
export declare class MeterCCReport extends MeterCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _type;
    get type(): number;
    readonly scale: number;
    private _value;
    get value(): number;
    private _previousValue;
    get previousValue(): number | undefined;
    private _rateType;
    get rateType(): RateType;
    private _deltaTime;
    get deltaTime(): Maybe<number>;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MeterCCGetOptions {
    scale?: number;
    rateType?: RateType;
}
export declare class MeterCCGet extends MeterCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (MeterCCGetOptions & CCCommandOptions));
    rateType: RateType | undefined;
    scale: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MeterCCSupportedReport extends MeterCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly type: number;
    readonly supportsReset: boolean;
    readonly supportedScales: readonly number[];
    readonly supportedRateTypes: readonly RateType[];
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MeterCCSupportedGet extends MeterCC {
}
type MeterCCResetOptions = {
    type?: undefined;
    targetValue?: undefined;
} | {
    type: number;
    targetValue: number;
};
export declare class MeterCCReset extends MeterCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (MeterCCResetOptions & CCCommandOptions));
    type: number | undefined;
    targetValue: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=MeterCC.d.ts.map