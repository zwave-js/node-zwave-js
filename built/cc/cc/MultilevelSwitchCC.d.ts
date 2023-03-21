/// <reference types="node" />
import { CommandClasses, Duration, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { LevelChangeDirection, MultilevelSwitchCommand, SwitchType } from "../lib/_Types";
export declare const MultilevelSwitchCCValues: Readonly<{
    levelChangeDown: ((switchType: SwitchType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: string;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: string;
        };
        readonly meta: {
            readonly label: `Perform a level change (${string})`;
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly ccSpecific: {
                readonly switchType: SwitchType;
            };
            readonly readable: false;
            readonly type: "boolean";
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
    levelChangeUp: ((switchType: SwitchType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: string;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: string;
        };
        readonly meta: {
            readonly label: `Perform a level change (${string})`;
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly ccSpecific: {
                readonly switchType: SwitchType;
            };
            readonly readable: false;
            readonly type: "boolean";
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
    superviseStartStopLevelChange: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: "superviseStartStopLevelChange";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: "superviseStartStopLevelChange";
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
            readonly autoCreate: true;
            readonly internal: true;
            readonly supportsEndpoints: false;
        };
    };
    switchType: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: "switchType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: "switchType";
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
    compatEvent: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: "event";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: "event";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Event value";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly stateful: false;
            readonly autoCreate: (applHost: ZWaveApplicationHost, endpoint: import("@zwave-js/core/safe").IZWaveEndpoint) => boolean;
        };
    };
    restorePrevious: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: "restorePrevious";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: "restorePrevious";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Restore previous value";
            readonly readable: false;
            readonly type: "boolean";
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
    duration: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: "duration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
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
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    targetValue: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: "targetValue";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: "targetValue";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Target value";
            readonly valueChangeOptions: readonly ["transitionDuration"];
            readonly max: 99;
            readonly min: 0;
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
    currentValue: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Switch"];
            property: "currentValue";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Switch"];
            readonly endpoint: number;
            readonly property: "currentValue";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Current value";
            readonly writeable: false;
            readonly max: 99;
            readonly min: 0;
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
export declare class MultilevelSwitchCCAPI extends CCAPI {
    supportsCommand(cmd: MultilevelSwitchCommand): Maybe<boolean>;
    get(): Promise<Pick<MultilevelSwitchCCReport, "duration" | "currentValue" | "targetValue"> | undefined>;
    /**
     * Sets the switch to a new value
     * @param targetValue The new target value for the switch
     * @param duration The duration after which the target value should be reached. Can be a Duration instance or a user-friendly duration string like `"1m17s"`. Only supported in V2 and above.
     * @returns A promise indicating whether the command was completed
     */
    set(targetValue: number, duration?: Duration | string): Promise<SupervisionResult | undefined>;
    startLevelChange(options: MultilevelSwitchCCStartLevelChangeOptions): Promise<SupervisionResult | undefined>;
    stopLevelChange(): Promise<SupervisionResult | undefined>;
    getSupported(): Promise<SwitchType | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class MultilevelSwitchCC extends CommandClass {
    ccCommand: MultilevelSwitchCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    setMappedBasicValue(applHost: ZWaveApplicationHost, value: number): boolean;
    protected createMetadataForLevelChangeActions(applHost: ZWaveApplicationHost, switchType?: SwitchType): void;
}
interface MultilevelSwitchCCSetOptions extends CCCommandOptions {
    targetValue: number;
    duration?: Duration | string;
}
export declare class MultilevelSwitchCCSet extends MultilevelSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultilevelSwitchCCSetOptions);
    targetValue: number;
    duration: Duration | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultilevelSwitchCCReport extends MultilevelSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly targetValue: number | undefined;
    readonly duration: Duration | undefined;
    private _currentValue;
    get currentValue(): Maybe<number> | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultilevelSwitchCCGet extends MultilevelSwitchCC {
}
type MultilevelSwitchCCStartLevelChangeOptions = {
    direction: keyof typeof LevelChangeDirection;
} & ({
    ignoreStartLevel: true;
    startLevel?: number;
} | {
    ignoreStartLevel: false;
    startLevel: number;
}) & {
    duration?: Duration | string;
};
export declare class MultilevelSwitchCCStartLevelChange extends MultilevelSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & MultilevelSwitchCCStartLevelChangeOptions));
    duration: Duration | undefined;
    startLevel: number;
    ignoreStartLevel: boolean;
    direction: keyof typeof LevelChangeDirection;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultilevelSwitchCCStopLevelChange extends MultilevelSwitchCC {
}
export declare class MultilevelSwitchCCSupportedReport extends MultilevelSwitchCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly switchType: SwitchType;
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultilevelSwitchCCSupportedGet extends MultilevelSwitchCC {
}
export {};
//# sourceMappingURL=MultilevelSwitchCC.d.ts.map