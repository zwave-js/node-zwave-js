/// <reference types="node" />
import type { Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { SetbackState, SetbackType, ThermostatSetbackCommand } from "../lib/_Types";
export declare const ThermostatSetbackCCValues: Readonly<{
    setbackState: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Setback"];
            property: "setbackState";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Setback"];
            readonly endpoint: number;
            readonly property: "setbackState";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly min: -12.8;
            readonly max: 12;
            readonly label: "Setback state";
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
    setbackType: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Setback"];
            property: "setbackType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Setback"];
            readonly endpoint: number;
            readonly property: "setbackType";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Setback type";
            readonly type: "any";
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
export declare class ThermostatSetbackCCAPI extends CCAPI {
    supportsCommand(cmd: ThermostatSetbackCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<Pick<ThermostatSetbackCCReport, "setbackType" | "setbackState"> | undefined>;
    set(setbackType: SetbackType, setbackState: SetbackState): Promise<SupervisionResult | undefined>;
}
export declare class ThermostatSetbackCC extends CommandClass {
    ccCommand: ThermostatSetbackCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface ThermostatSetbackCCSetOptions extends CCCommandOptions {
    setbackType: SetbackType;
    setbackState: SetbackState;
}
export declare class ThermostatSetbackCCSet extends ThermostatSetbackCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ThermostatSetbackCCSetOptions);
    setbackType: SetbackType;
    /** The offset from the setpoint in 0.1 Kelvin or a special mode */
    setbackState: SetbackState;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatSetbackCCReport extends ThermostatSetbackCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly setbackType: SetbackType;
    readonly setbackState: SetbackState;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatSetbackCCGet extends ThermostatSetbackCC {
}
export {};
//# sourceMappingURL=ThermostatSetbackCC.d.ts.map