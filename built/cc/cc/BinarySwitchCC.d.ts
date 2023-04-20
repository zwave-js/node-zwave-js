/// <reference types="node" />
import { CommandClasses, Duration, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import type { AllOrNone } from "@zwave-js/shared";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { BinarySwitchCommand } from "../lib/_Types";
export declare const BinarySwitchCCValues: Readonly<{
    duration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Binary Switch"];
            property: "duration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Binary Switch"];
            readonly endpoint: number;
            readonly property: "duration";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Remaining duration";
            readonly writeable: false;
            readonly type: "duration";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    targetValue: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Binary Switch"];
            property: "targetValue";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Binary Switch"];
            readonly endpoint: number;
            readonly property: "targetValue";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Target value";
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly type: "boolean";
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
    currentValue: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Binary Switch"];
            property: "currentValue";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Binary Switch"];
            readonly endpoint: number;
            readonly property: "currentValue";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Current value";
            readonly writeable: false;
            readonly type: "boolean";
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
export declare class BinarySwitchCCAPI extends CCAPI {
    supportsCommand(cmd: BinarySwitchCommand): Maybe<boolean>;
    get(): Promise<{
        currentValue: boolean | ("unknown" & {
            __brand: boolean;
        });
        targetValue: boolean | undefined;
        duration: Duration | undefined;
    } | undefined>;
    /**
     * Sets the switch to the given value
     * @param targetValue The target value to set
     * @param duration The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.
     */
    set(targetValue: boolean, duration?: Duration | string): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class BinarySwitchCC extends CommandClass {
    ccCommand: BinarySwitchCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    setMappedBasicValue(applHost: ZWaveApplicationHost, value: number): boolean;
}
interface BinarySwitchCCSetOptions extends CCCommandOptions {
    targetValue: boolean;
    duration?: Duration | string;
}
export declare class BinarySwitchCCSet extends BinarySwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BinarySwitchCCSetOptions);
    targetValue: boolean;
    duration: Duration | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export type BinarySwitchCCReportOptions = CCCommandOptions & {
    currentValue: boolean;
} & AllOrNone<{
    targetValue: boolean;
    duration: Duration | string;
}>;
export declare class BinarySwitchCCReport extends BinarySwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BinarySwitchCCReportOptions);
    readonly currentValue: Maybe<boolean> | undefined;
    readonly targetValue: boolean | undefined;
    readonly duration: Duration | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BinarySwitchCCGet extends BinarySwitchCC {
}
export {};
//# sourceMappingURL=BinarySwitchCC.d.ts.map