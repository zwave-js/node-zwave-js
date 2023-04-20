import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import { CommandClasses } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE } from "../lib/API";
import { CommandClass, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ThermostatOperatingState, ThermostatOperatingStateCommand } from "../lib/_Types";
export declare const ThermostatOperatingStateCCValues: Readonly<{
    operatingState: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Thermostat Operating State"];
            property: "state";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Thermostat Operating State"];
            readonly endpoint: number;
            readonly property: "state";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Operating state";
            readonly states: {
                [x: number]: string;
            };
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
export declare class ThermostatOperatingStateCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: ThermostatOperatingStateCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<ThermostatOperatingState | undefined>;
}
export declare class ThermostatOperatingStateCC extends CommandClass {
    ccCommand: ThermostatOperatingStateCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class ThermostatOperatingStateCCReport extends ThermostatOperatingStateCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly state: ThermostatOperatingState;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ThermostatOperatingStateCCGet extends ThermostatOperatingStateCC {
}
//# sourceMappingURL=ThermostatOperatingStateCC.d.ts.map