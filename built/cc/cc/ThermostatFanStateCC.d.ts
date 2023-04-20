import { CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE } from "../lib/API";
import { CommandClass, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ThermostatFanState, ThermostatFanStateCommand } from "../lib/_Types";
export declare const ThermostatFanStateCCValues: Readonly<{
    fanState: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Fan State"];
            property: "state";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Fan State"];
            readonly endpoint: number;
            readonly property: "state";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly states: {
                [x: number]: string;
            };
            readonly label: "Thermostat fan state";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
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
}>;
export declare class ThermostatFanStateCCAPI extends CCAPI {
    supportsCommand(cmd: ThermostatFanStateCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<ThermostatFanState | undefined>;
}
export declare class ThermostatFanStateCC extends CommandClass {
    ccCommand: ThermostatFanStateCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class ThermostatFanStateCCReport extends ThermostatFanStateCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly state: ThermostatFanState;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatFanStateCCGet extends ThermostatFanStateCC {
}
//# sourceMappingURL=ThermostatFanStateCC.d.ts.map