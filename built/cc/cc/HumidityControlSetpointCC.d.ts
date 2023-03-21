/// <reference types="node" />
import type { Scale } from "@zwave-js/config";
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { HumidityControlSetpointCapabilities, HumidityControlSetpointCommand, HumidityControlSetpointType, HumidityControlSetpointValue } from "../lib/_Types";
export declare const HumidityControlSetpointCCValues: Readonly<{
    setpointScale: ((setpointType: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Humidity Control Setpoint"];
            readonly endpoint: number;
            readonly property: "setpointScale";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Humidity Control Setpoint"];
            property: "setpointScale";
            propertyKey: number;
        };
        readonly meta: {
            readonly label: `Setpoint scale (${string})`;
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
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
    setpoint: ((setpointType: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Humidity Control Setpoint"];
            readonly endpoint: number;
            readonly property: "setpoint";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Humidity Control Setpoint"];
            property: "setpoint";
            propertyKey: number;
        };
        readonly meta: {
            readonly label: `Setpoint (${string})`;
            readonly ccSpecific: {
                readonly setpointType: number;
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
    supportedSetpointTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Humidity Control Setpoint"];
            property: "supportedSetpointTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Humidity Control Setpoint"];
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
export declare class HumidityControlSetpointCCAPI extends CCAPI {
    supportsCommand(cmd: HumidityControlSetpointCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(setpointType: HumidityControlSetpointType): Promise<HumidityControlSetpointValue | undefined>;
    set(setpointType: HumidityControlSetpointType, value: number, scale: number): Promise<SupervisionResult | undefined>;
    getCapabilities(setpointType: HumidityControlSetpointType): Promise<HumidityControlSetpointCapabilities | undefined>;
    getSupportedSetpointTypes(): Promise<readonly HumidityControlSetpointType[] | undefined>;
    getSupportedScales(setpointType: HumidityControlSetpointType): Promise<readonly Scale[] | undefined>;
}
export declare class HumidityControlSetpointCC extends CommandClass {
    ccCommand: HumidityControlSetpointCommand;
    translatePropertyKey(applHost: ZWaveApplicationHost, property: string | number, propertyKey: string | number): string | undefined;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface HumidityControlSetpointCCSetOptions extends CCCommandOptions {
    setpointType: HumidityControlSetpointType;
    value: number;
    scale: number;
}
export declare class HumidityControlSetpointCCSet extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | HumidityControlSetpointCCSetOptions);
    setpointType: HumidityControlSetpointType;
    value: number;
    scale: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlSetpointCCReport extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _type;
    get type(): HumidityControlSetpointType;
    readonly scale: number;
    private _value;
    get value(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface HumidityControlSetpointCCGetOptions extends CCCommandOptions {
    setpointType: HumidityControlSetpointType;
}
export declare class HumidityControlSetpointCCGet extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | HumidityControlSetpointCCGetOptions);
    setpointType: HumidityControlSetpointType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlSetpointCCSupportedReport extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedSetpointTypes: readonly HumidityControlSetpointType[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlSetpointCCSupportedGet extends HumidityControlSetpointCC {
}
export declare class HumidityControlSetpointCCScaleSupportedReport extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedScales: readonly number[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface HumidityControlSetpointCCScaleSupportedGetOptions extends CCCommandOptions {
    setpointType: HumidityControlSetpointType;
}
export declare class HumidityControlSetpointCCScaleSupportedGet extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | HumidityControlSetpointCCScaleSupportedGetOptions);
    setpointType: HumidityControlSetpointType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlSetpointCCCapabilitiesReport extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _type;
    get type(): HumidityControlSetpointType;
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
interface HumidityControlSetpointCCCapabilitiesGetOptions extends CCCommandOptions {
    setpointType: HumidityControlSetpointType;
}
export declare class HumidityControlSetpointCCCapabilitiesGet extends HumidityControlSetpointCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | HumidityControlSetpointCCCapabilitiesGetOptions);
    setpointType: HumidityControlSetpointType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=HumidityControlSetpointCC.d.ts.map