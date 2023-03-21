/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ThermostatFanMode, ThermostatFanModeCommand } from "../lib/_Types";
export declare const ThermostatFanModeCCValues: Readonly<{
    supportedFanModes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Fan Mode"];
            property: "supportedModes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Fan Mode"];
            readonly endpoint: number;
            readonly property: "supportedModes";
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
    fanMode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Fan Mode"];
            property: "mode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Fan Mode"];
            readonly endpoint: number;
            readonly property: "mode";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly states: {
                [x: number]: string;
            };
            readonly label: "Thermostat fan mode";
            readonly min: 0;
            readonly max: 255;
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
    turnedOff: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Fan Mode"];
            property: "off";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Fan Mode"];
            readonly endpoint: number;
            readonly property: "off";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Thermostat fan turned off";
            readonly type: "boolean";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 3;
        };
    };
}>;
export declare class ThermostatFanModeCCAPI extends CCAPI {
    supportsCommand(cmd: ThermostatFanModeCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<Pick<ThermostatFanModeCCReport, "off" | "mode"> | undefined>;
    set(mode: ThermostatFanMode, off?: boolean): Promise<SupervisionResult | undefined>;
    getSupportedModes(): Promise<readonly ThermostatFanMode[] | undefined>;
}
export declare class ThermostatFanModeCC extends CommandClass {
    ccCommand: ThermostatFanModeCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
type ThermostatFanModeCCSetOptions = CCCommandOptions & {
    mode: ThermostatFanMode;
    off?: boolean;
};
export declare class ThermostatFanModeCCSet extends ThermostatFanModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ThermostatFanModeCCSetOptions);
    mode: ThermostatFanMode;
    off: boolean | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatFanModeCCReport extends ThermostatFanModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly mode: ThermostatFanMode;
    readonly off: boolean | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatFanModeCCGet extends ThermostatFanModeCC {
}
export declare class ThermostatFanModeCCSupportedReport extends ThermostatFanModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly supportedModes: ThermostatFanMode[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatFanModeCCSupportedGet extends ThermostatFanModeCC {
}
export {};
//# sourceMappingURL=ThermostatFanModeCC.d.ts.map