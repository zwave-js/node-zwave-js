/// <reference types="node" />
import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import { CommandClasses } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { ZWavePlusCommand, ZWavePlusNodeType, ZWavePlusRoleType } from "../lib/_Types";
export declare const ZWavePlusCCValues: Readonly<{
    installerIcon: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            property: "installerIcon";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            readonly endpoint: number;
            readonly property: "installerIcon";
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
    userIcon: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            property: "userIcon";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            readonly endpoint: number;
            readonly property: "userIcon";
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
    roleType: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            property: "roleType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            readonly endpoint: number;
            readonly property: "roleType";
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
            readonly supportsEndpoints: false;
            readonly internal: true;
        };
    };
    nodeType: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            property: "nodeType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            readonly endpoint: number;
            readonly property: "nodeType";
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
            readonly supportsEndpoints: false;
            readonly internal: true;
        };
    };
    zwavePlusVersion: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            property: "zwavePlusVersion";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Z-Wave Plus Info"];
            readonly endpoint: number;
            readonly property: "zwavePlusVersion";
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
            readonly supportsEndpoints: false;
            readonly internal: true;
        };
    };
}>;
export declare class ZWavePlusCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: ZWavePlusCommand): Maybe<boolean>;
    get(): Promise<Pick<ZWavePlusCCReport, "nodeType" | "zwavePlusVersion" | "roleType" | "userIcon" | "installerIcon"> | undefined>;
    sendReport(options: ZWavePlusCCReportOptions): Promise<void>;
}
export declare class ZWavePlusCC extends CommandClass {
    ccCommand: ZWavePlusCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
export interface ZWavePlusCCReportOptions {
    zwavePlusVersion: number;
    nodeType: ZWavePlusNodeType;
    roleType: ZWavePlusRoleType;
    installerIcon: number;
    userIcon: number;
}
export declare class ZWavePlusCCReport extends ZWavePlusCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (CCCommandOptions & ZWavePlusCCReportOptions));
    zwavePlusVersion: number;
    nodeType: ZWavePlusNodeType;
    roleType: ZWavePlusRoleType;
    installerIcon: number;
    userIcon: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ZWavePlusCCGet extends ZWavePlusCC {
}
//# sourceMappingURL=ZWavePlusCC.d.ts.map