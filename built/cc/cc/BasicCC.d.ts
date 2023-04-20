/// <reference types="node" />
import { CommandClasses, Duration, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { AllOrNone } from "@zwave-js/shared/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { BasicCommand } from "../lib/_Types";
export declare const BasicCCValues: Readonly<{
    compatEvent: {
        readonly id: {
            commandClass: CommandClasses.Basic;
            property: "event";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Basic;
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
            commandClass: CommandClasses.Basic;
            property: "restorePrevious";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Basic;
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
            commandClass: CommandClasses.Basic;
            property: "duration";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Basic;
            readonly endpoint: number;
            readonly property: "duration";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Remaining duration";
            readonly minVersion: number;
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
            commandClass: CommandClasses.Basic;
            property: "targetValue";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Basic;
            readonly endpoint: number;
            readonly property: "targetValue";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Target value";
            readonly forceCreation: boolean;
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
    currentValue: {
        readonly id: {
            commandClass: CommandClasses.Basic;
            property: "currentValue";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Basic;
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
export declare class BasicCCAPI extends CCAPI {
    supportsCommand(cmd: BasicCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<Pick<BasicCCReport, "duration" | "currentValue" | "targetValue"> | undefined>;
    set(targetValue: number): Promise<SupervisionResult | undefined>;
}
export declare class BasicCC extends CommandClass {
    ccCommand: BasicCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface BasicCCSetOptions extends CCCommandOptions {
    targetValue: number;
}
export declare class BasicCCSet extends BasicCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BasicCCSetOptions);
    targetValue: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type BasicCCReportOptions = CCCommandOptions & {
    currentValue: number;
} & AllOrNone<{
    targetValue: number;
    duration: Duration;
}>;
export declare class BasicCCReport extends BasicCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BasicCCReportOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _currentValue;
    get currentValue(): Maybe<number> | undefined;
    readonly targetValue: number | undefined;
    readonly duration: Duration | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BasicCCGet extends BasicCC {
}
export {};
//# sourceMappingURL=BasicCC.d.ts.map