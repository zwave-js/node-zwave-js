/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { BarrierOperatorCommand, BarrierState, SubsystemState, SubsystemType } from "../lib/_Types";
export declare const BarrierOperatorCCValues: Readonly<{
    signalingState: ((subsystemType: SubsystemType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Barrier Operator"];
            readonly endpoint: number;
            readonly property: "signalingState";
            readonly propertyKey: SubsystemType;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Barrier Operator"];
            property: "signalingState";
            propertyKey: SubsystemType;
        };
        readonly meta: {
            readonly label: `Signaling State (${string})`;
            readonly states: {
                [x: number]: string;
            };
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
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
    currentState: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Barrier Operator"];
            property: "currentState";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Barrier Operator"];
            readonly endpoint: number;
            readonly property: "currentState";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Current Barrier State";
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
    targetState: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Barrier Operator"];
            property: "targetState";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Barrier Operator"];
            readonly endpoint: number;
            readonly property: "targetState";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Target Barrier State";
            readonly states: {
                [x: number]: string;
            };
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
    position: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Barrier Operator"];
            property: "position";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Barrier Operator"];
            readonly endpoint: number;
            readonly property: "position";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Barrier Position";
            readonly unit: "%";
            readonly max: 100;
            readonly writeable: false;
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
    supportedSubsystemTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Barrier Operator"];
            property: "supportedSubsystemTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Barrier Operator"];
            readonly endpoint: number;
            readonly property: "supportedSubsystemTypes";
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
}>;
export declare class BarrierOperatorCCAPI extends CCAPI {
    supportsCommand(cmd: BarrierOperatorCommand): Maybe<boolean>;
    get(): Promise<Pick<BarrierOperatorCCReport, "position" | "currentState"> | undefined>;
    set(targetState: BarrierState.Open | BarrierState.Closed): Promise<SupervisionResult | undefined>;
    getSignalingCapabilities(): Promise<readonly SubsystemType[] | undefined>;
    getEventSignaling(subsystemType: SubsystemType): Promise<SubsystemState | undefined>;
    setEventSignaling(subsystemType: SubsystemType, subsystemState: SubsystemState): Promise<SupervisionResult | undefined>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
}
export declare class BarrierOperatorCC extends CommandClass {
    ccCommand: BarrierOperatorCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface BarrierOperatorCCSetOptions extends CCCommandOptions {
    targetState: BarrierState.Open | BarrierState.Closed;
}
export declare class BarrierOperatorCCSet extends BarrierOperatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BarrierOperatorCCSetOptions);
    targetState: BarrierState.Open | BarrierState.Closed;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BarrierOperatorCCReport extends BarrierOperatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly currentState: BarrierState | undefined;
    readonly position: number | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BarrierOperatorCCGet extends BarrierOperatorCC {
}
export declare class BarrierOperatorCCSignalingCapabilitiesReport extends BarrierOperatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedSubsystemTypes: readonly SubsystemType[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BarrierOperatorCCSignalingCapabilitiesGet extends BarrierOperatorCC {
}
interface BarrierOperatorCCEventSignalingSetOptions extends CCCommandOptions {
    subsystemType: SubsystemType;
    subsystemState: SubsystemState;
}
export declare class BarrierOperatorCCEventSignalingSet extends BarrierOperatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BarrierOperatorCCEventSignalingSetOptions);
    subsystemType: SubsystemType;
    subsystemState: SubsystemState;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BarrierOperatorCCEventSignalingReport extends BarrierOperatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly subsystemType: SubsystemType;
    readonly subsystemState: SubsystemState;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface BarrierOperatorCCEventSignalingGetOptions extends CCCommandOptions {
    subsystemType: SubsystemType;
}
export declare class BarrierOperatorCCEventSignalingGet extends BarrierOperatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BarrierOperatorCCEventSignalingGetOptions);
    subsystemType: SubsystemType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=BarrierOperatorCC.d.ts.map