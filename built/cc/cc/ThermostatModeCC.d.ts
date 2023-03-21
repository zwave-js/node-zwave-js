/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ThermostatMode, ThermostatModeCommand } from "../lib/_Types";
export declare const ThermostatModeCCValues: Readonly<{
    supportedModes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Mode"];
            property: "supportedModes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Mode"];
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
    manufacturerData: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Mode"];
            property: "manufacturerData";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Mode"];
            readonly endpoint: number;
            readonly property: "manufacturerData";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Manufacturer data";
            readonly writeable: false;
            readonly type: "buffer";
            readonly readable: true;
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
    thermostatMode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Mode"];
            property: "mode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Mode"];
            readonly endpoint: number;
            readonly property: "mode";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly states: {
                [x: number]: string;
            };
            readonly label: "Thermostat mode";
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
}>;
export declare class ThermostatModeCCAPI extends CCAPI {
    supportsCommand(cmd: ThermostatModeCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<Pick<ThermostatModeCCReport, "mode" | "manufacturerData"> | undefined>;
    set(mode: Exclude<ThermostatMode, (typeof ThermostatMode)["Manufacturer specific"]>): Promise<SupervisionResult | undefined>;
    set(mode: (typeof ThermostatMode)["Manufacturer specific"], manufacturerData: Buffer): Promise<SupervisionResult | undefined>;
    getSupportedModes(): Promise<readonly ThermostatMode[] | undefined>;
}
export declare class ThermostatModeCC extends CommandClass {
    ccCommand: ThermostatModeCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
type ThermostatModeCCSetOptions = CCCommandOptions & ({
    mode: Exclude<ThermostatMode, (typeof ThermostatMode)["Manufacturer specific"]>;
} | {
    mode: (typeof ThermostatMode)["Manufacturer specific"];
    manufacturerData: Buffer;
});
export declare class ThermostatModeCCSet extends ThermostatModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ThermostatModeCCSetOptions);
    mode: ThermostatMode;
    manufacturerData?: Buffer;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatModeCCReport extends ThermostatModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly mode: ThermostatMode;
    readonly manufacturerData: Buffer | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatModeCCGet extends ThermostatModeCC {
}
export declare class ThermostatModeCCSupportedReport extends ThermostatModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly supportedModes: ThermostatMode[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatModeCCSupportedGet extends ThermostatModeCC {
}
export {};
//# sourceMappingURL=ThermostatModeCC.d.ts.map