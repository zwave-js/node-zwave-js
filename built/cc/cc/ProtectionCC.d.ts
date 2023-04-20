/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult, Timeout } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { LocalProtectionState, ProtectionCommand, RFProtectionState } from "../lib/_Types";
export declare const ProtectionCCValues: Readonly<{
    supportedRFStates: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "supportedRFStates";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "supportedRFStates";
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
    supportedLocalStates: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "supportedLocalStates";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "supportedLocalStates";
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
    supportsTimeout: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "supportsTimeout";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "supportsTimeout";
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
    supportsExclusiveControl: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "supportsExclusiveControl";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "supportsExclusiveControl";
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
    timeout: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "timeout";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "timeout";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "RF protection timeout";
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
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
    rfProtectionState: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "rf";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "rf";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "RF protection state";
            readonly states: {
                [x: number]: string;
            };
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
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
    localProtectionState: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "local";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "local";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Local protection state";
            readonly states: {
                [x: number]: string;
            };
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
    exclusiveControlNodeId: {
        readonly id: {
            commandClass: CommandClasses.Protection;
            property: "exclusiveControlNodeId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Protection;
            readonly endpoint: number;
            readonly property: "exclusiveControlNodeId";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly min: 1;
            readonly max: 232;
            readonly label: "Node ID with exclusive control";
            readonly type: "number";
            readonly readable: true;
            readonly writeable: true;
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
}>;
export declare class ProtectionCCAPI extends CCAPI {
    supportsCommand(cmd: ProtectionCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<Pick<ProtectionCCReport, "local" | "rf"> | undefined>;
    set(local: LocalProtectionState, rf?: RFProtectionState): Promise<SupervisionResult | undefined>;
    getSupported(): Promise<Pick<ProtectionCCSupportedReport, "supportsExclusiveControl" | "supportsTimeout" | "supportedLocalStates" | "supportedRFStates"> | undefined>;
    getExclusiveControl(): Promise<number | undefined>;
    setExclusiveControl(nodeId: number): Promise<SupervisionResult | undefined>;
    getTimeout(): Promise<Timeout | undefined>;
    setTimeout(timeout: Timeout): Promise<SupervisionResult | undefined>;
}
export declare class ProtectionCC extends CommandClass {
    ccCommand: ProtectionCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface ProtectionCCSetOptions extends CCCommandOptions {
    local: LocalProtectionState;
    rf?: RFProtectionState;
}
export declare class ProtectionCCSet extends ProtectionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ProtectionCCSetOptions);
    local: LocalProtectionState;
    rf?: RFProtectionState;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ProtectionCCReport extends ProtectionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly local: LocalProtectionState;
    readonly rf?: RFProtectionState;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ProtectionCCGet extends ProtectionCC {
}
export declare class ProtectionCCSupportedReport extends ProtectionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly supportsExclusiveControl: boolean;
    readonly supportsTimeout: boolean;
    readonly supportedLocalStates: LocalProtectionState[];
    readonly supportedRFStates: RFProtectionState[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ProtectionCCSupportedGet extends ProtectionCC {
}
export declare class ProtectionCCExclusiveControlReport extends ProtectionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly exclusiveControlNodeId: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ProtectionCCExclusiveControlGet extends ProtectionCC {
}
interface ProtectionCCExclusiveControlSetOptions extends CCCommandOptions {
    exclusiveControlNodeId: number;
}
export declare class ProtectionCCExclusiveControlSet extends ProtectionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ProtectionCCExclusiveControlSetOptions);
    exclusiveControlNodeId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ProtectionCCTimeoutReport extends ProtectionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly timeout: Timeout;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ProtectionCCTimeoutGet extends ProtectionCC {
}
interface ProtectionCCTimeoutSetOptions extends CCCommandOptions {
    timeout: Timeout;
}
export declare class ProtectionCCTimeoutSet extends ProtectionCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ProtectionCCTimeoutSetOptions);
    timeout: Timeout;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=ProtectionCC.d.ts.map