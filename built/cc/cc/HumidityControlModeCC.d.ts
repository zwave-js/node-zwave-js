/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { HumidityControlMode, HumidityControlModeCommand } from "../lib/_Types";
export declare const HumidityControlModeCCValues: Readonly<{
    supportedModes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Humidity Control Mode"];
            property: "supportedModes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Humidity Control Mode"];
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
    mode: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Humidity Control Mode"];
            property: "mode";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Humidity Control Mode"];
            readonly endpoint: number;
            readonly property: "mode";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly states: {
                [x: number]: string;
            };
            readonly label: "Humidity control mode";
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
export declare class HumidityControlModeCCAPI extends CCAPI {
    supportsCommand(cmd: HumidityControlModeCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<HumidityControlMode | undefined>;
    set(mode: HumidityControlMode): Promise<SupervisionResult | undefined>;
    getSupportedModes(): Promise<readonly HumidityControlMode[] | undefined>;
}
export declare class HumidityControlModeCC extends CommandClass {
    ccCommand: HumidityControlModeCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface HumidityControlModeCCSetOptions extends CCCommandOptions {
    mode: HumidityControlMode;
}
export declare class HumidityControlModeCCSet extends HumidityControlModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | HumidityControlModeCCSetOptions);
    mode: HumidityControlMode;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlModeCCReport extends HumidityControlModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly mode: HumidityControlMode;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlModeCCGet extends HumidityControlModeCC {
}
export declare class HumidityControlModeCCSupportedReport extends HumidityControlModeCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _supportedModes;
    get supportedModes(): readonly HumidityControlMode[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class HumidityControlModeCCSupportedGet extends HumidityControlModeCC {
}
export {};
//# sourceMappingURL=HumidityControlModeCC.d.ts.map