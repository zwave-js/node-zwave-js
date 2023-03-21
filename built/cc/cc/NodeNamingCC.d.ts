/// <reference types="node" />
import { CommandClasses, SupervisionResult, type Maybe, type MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { NodeNamingAndLocationCommand } from "../lib/_Types";
export declare const NodeNamingAndLocationCCValues: Readonly<{
    location: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Node Naming and Location"];
            property: "location";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Node Naming and Location"];
            readonly endpoint: number;
            readonly property: "location";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Node location";
            readonly type: "string";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
    name: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Node Naming and Location"];
            property: "name";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Node Naming and Location"];
            readonly endpoint: number;
            readonly property: "name";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Node name";
            readonly type: "string";
            readonly readable: true;
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
}>;
export declare class NodeNamingAndLocationCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: NodeNamingAndLocationCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    getName(): Promise<string | undefined>;
    setName(name: string): Promise<SupervisionResult | undefined>;
    getLocation(): Promise<string | undefined>;
    setLocation(location: string): Promise<SupervisionResult | undefined>;
}
export declare class NodeNamingAndLocationCC extends CommandClass {
    ccCommand: NodeNamingAndLocationCommand;
    skipEndpointInterview(): boolean;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface NodeNamingAndLocationCCNameSetOptions extends CCCommandOptions {
    name: string;
}
export declare class NodeNamingAndLocationCCNameSet extends NodeNamingAndLocationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | NodeNamingAndLocationCCNameSetOptions);
    name: string;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class NodeNamingAndLocationCCNameReport extends NodeNamingAndLocationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
    readonly name: string;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class NodeNamingAndLocationCCNameGet extends NodeNamingAndLocationCC {
}
interface NodeNamingAndLocationCCLocationSetOptions extends CCCommandOptions {
    location: string;
}
export declare class NodeNamingAndLocationCCLocationSet extends NodeNamingAndLocationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | NodeNamingAndLocationCCLocationSetOptions);
    location: string;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class NodeNamingAndLocationCCLocationReport extends NodeNamingAndLocationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | CCCommandOptions);
    readonly location: string;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class NodeNamingAndLocationCCLocationGet extends NodeNamingAndLocationCC {
}
export {};
//# sourceMappingURL=NodeNamingCC.d.ts.map