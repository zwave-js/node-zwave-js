/// <reference types="node" />
import type { Scale } from "@zwave-js/config";
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ThermostatSetpointCommand, ThermostatSetpointType } from "../lib/_Types";
export declare const ThermostatSetpointCCValues: Readonly<{
    setpointScale: ((setpointType: ThermostatSetpointType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            readonly endpoint: number;
            readonly property: "setpointScale";
            readonly propertyKey: ThermostatSetpointType;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            property: "setpointScale";
            propertyKey: ThermostatSetpointType;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    setpoint: ((setpointType: ThermostatSetpointType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            readonly endpoint: number;
            readonly property: "setpoint";
            readonly propertyKey: ThermostatSetpointType;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            property: "setpoint";
            propertyKey: ThermostatSetpointType;
        };
        readonly meta: {
            readonly label: `Setpoint (${string})`;
            readonly ccSpecific: {
                readonly setpointType: ThermostatSetpointType;
            };
            readonly type: "number";
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
    setpointTypesInterpretation: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            property: "setpointTypesInterpretation";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            readonly endpoint: number;
            readonly property: "setpointTypesInterpretation";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
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
    supportedSetpointTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            property: "supportedSetpointTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Setpoint"];
            readonly endpoint: number;
            readonly property: "supportedSetpointTypes";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
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
export declare class ThermostatSetpointCCAPI extends CCAPI {
    supportsCommand(cmd: ThermostatSetpointCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(setpointType: ThermostatSetpointType): Promise<{
        value: number;
        scale: Scale;
    } | undefined>;
    set(setpointType: ThermostatSetpointType, value: number, scale: number): Promise<SupervisionResult | undefined>;
    getCapabilities(setpointType: ThermostatSetpointType): Promise<Pick<ThermostatSetpointCCCapabilitiesReport, "minValue" | "maxValue" | "minValueScale" | "maxValueScale"> | undefined>;
    /**
     * Requests the supported setpoint types from the node. Due to inconsistencies it is NOT recommended
     * to use this method on nodes with CC versions 1 and 2. Instead rely on the information determined
     * during node interview.
     */
    getSupportedSetpointTypes(): Promise<readonly ThermostatSetpointType[] | undefined>;
}
export declare class ThermostatSetpointCC extends CommandClass {
    ccCommand: ThermostatSetpointCommand;
    translatePropertyKey(applHost: ZWaveApplicationHost, property: string | number, propertyKey: string | number): string | undefined;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface ThermostatSetpointCCSetOptions extends CCCommandOptions {
    setpointType: ThermostatSetpointType;
    value: number;
    scale: number;
}
export declare class ThermostatSetpointCCSet extends ThermostatSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ThermostatSetpointCCSetOptions);
    setpointType: ThermostatSetpointType;
    value: number;
    scale: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatSetpointCCReport extends ThermostatSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _type;
    get type(): ThermostatSetpointType;
    readonly scale: number;
    private _value;
    get value(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ThermostatSetpointCCGetOptions extends CCCommandOptions {
    setpointType: ThermostatSetpointType;
}
export declare class ThermostatSetpointCCGet extends ThermostatSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ThermostatSetpointCCGetOptions);
    setpointType: ThermostatSetpointType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatSetpointCCCapabilitiesReport extends ThermostatSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _type;
    get type(): ThermostatSetpointType;
    private _minValue;
    get minValue(): number;
    private _maxValue;
    get maxValue(): number;
    private _minValueScale;
    get minValueScale(): number;
    private _maxValueScale;
    get maxValueScale(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ThermostatSetpointCCCapabilitiesGetOptions extends CCCommandOptions {
    setpointType: ThermostatSetpointType;
}
export declare class ThermostatSetpointCCCapabilitiesGet extends ThermostatSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ThermostatSetpointCCCapabilitiesGetOptions);
    setpointType: ThermostatSetpointType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatSetpointCCSupportedReport extends ThermostatSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedSetpointTypes: readonly ThermostatSetpointType[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatSetpointCCSupportedGet extends ThermostatSetpointCC {
}
export {};
//# sourceMappingURL=ThermostatSetpointCC.d.ts.map