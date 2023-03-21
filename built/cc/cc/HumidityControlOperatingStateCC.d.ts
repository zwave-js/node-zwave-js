import { CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE } from "../lib/API";
import { CommandClass, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { HumidityControlOperatingState, HumidityControlOperatingStateCommand } from "../lib/_Types";
export declare const HumidityControlOperatingStateCCValues: Readonly<{
    state: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Humidity Control Operating State"];
            property: "state";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Humidity Control Operating State"];
            readonly endpoint: number;
            readonly property: "state";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly states: {
                [x: number]: string;
            };
            readonly label: "Humidity control operating state";
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
export declare class HumidityControlOperatingStateCCAPI extends CCAPI {
    supportsCommand(cmd: HumidityControlOperatingStateCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<HumidityControlOperatingState | undefined>;
}
export declare class HumidityControlOperatingStateCC extends CommandClass {
    ccCommand: HumidityControlOperatingStateCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class HumidityControlOperatingStateCCReport extends HumidityControlOperatingStateCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly state: HumidityControlOperatingState;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlOperatingStateCCGet extends HumidityControlOperatingStateCC {
}
//# sourceMappingURL=HumidityControlOperatingStateCC.d.ts.map