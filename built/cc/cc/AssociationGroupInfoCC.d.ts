/// <reference types="node" />
import { CommandClasses, IZWaveEndpoint, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { AssociationGroupInfoCommand, AssociationGroupInfoProfile } from "../lib/_Types";
export declare const AssociationGroupInfoCCValues: Readonly<{
    commands: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Association Group Information"];
            readonly endpoint: number;
            readonly property: "issuedCommands";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Association Group Information"];
            property: "issuedCommands";
            propertyKey: number;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    groupInfo: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Association Group Information"];
            readonly endpoint: number;
            readonly property: "info";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Association Group Information"];
            property: "info";
            propertyKey: number;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    groupName: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Association Group Information"];
            readonly endpoint: number;
            readonly property: "name";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Association Group Information"];
            property: "name";
            propertyKey: number;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    hasDynamicInfo: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Association Group Information"];
            property: "hasDynamicInfo";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Association Group Information"];
            readonly endpoint: number;
            readonly property: "hasDynamicInfo";
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
export declare class AssociationGroupInfoCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: AssociationGroupInfoCommand): Maybe<boolean>;
    getGroupName(groupId: number): Promise<string | undefined>;
    getGroupInfo(groupId: number, refreshCache?: boolean): Promise<{
        mode: number;
        profile: number;
        eventCode: number;
        hasDynamicInfo: boolean;
    } | undefined>;
    getCommands(groupId: number, allowCache?: boolean): Promise<AssociationGroupInfoCCCommandListReport["commands"] | undefined>;
}
export declare class AssociationGroupInfoCC extends CommandClass {
    ccCommand: AssociationGroupInfoCommand;
    determineRequiredCCInterviews(): readonly CommandClasses[];
    /** Returns the name of an association group */
    static getGroupNameCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, groupId: number): string | undefined;
    /** Returns the association profile for an association group */
    static getGroupProfileCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, groupId: number): AssociationGroupInfoProfile | undefined;
    /** Returns the dictionary of all commands issued by the given association group */
    static getIssuedCommandsCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, groupId: number): ReadonlyMap<CommandClasses, readonly number[]> | undefined;
    static findGroupsForIssuedCommand(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, ccId: CommandClasses, command: number): number[];
    private static getAssociationGroupCountCached;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class AssociationGroupInfoCCNameReport extends AssociationGroupInfoCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly groupId: number;
    readonly name: string;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface AssociationGroupInfoCCNameGetOptions extends CCCommandOptions {
    groupId: number;
}
export declare class AssociationGroupInfoCCNameGet extends AssociationGroupInfoCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | AssociationGroupInfoCCNameGetOptions);
    groupId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export interface AssociationGroupInfo {
    groupId: number;
    mode: number;
    profile: number;
    eventCode: number;
}
export declare class AssociationGroupInfoCCInfoReport extends AssociationGroupInfoCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly isListMode: boolean;
    readonly hasDynamicInfo: boolean;
    readonly groups: readonly AssociationGroupInfo[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type AssociationGroupInfoCCInfoGetOptions = CCCommandOptions & {
    refreshCache: boolean;
} & ({
    listMode: boolean;
} | {
    groupId: number;
});
export declare class AssociationGroupInfoCCInfoGet extends AssociationGroupInfoCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | AssociationGroupInfoCCInfoGetOptions);
    refreshCache: boolean;
    listMode?: boolean;
    groupId?: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class AssociationGroupInfoCCCommandListReport extends AssociationGroupInfoCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly groupId: number;
    readonly commands: ReadonlyMap<CommandClasses, readonly number[]>;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface AssociationGroupInfoCCCommandListGetOptions extends CCCommandOptions {
    allowCache: boolean;
    groupId: number;
}
export declare class AssociationGroupInfoCCCommandListGet extends AssociationGroupInfoCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | AssociationGroupInfoCCCommandListGetOptions);
    allowCache: boolean;
    groupId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=AssociationGroupInfoCC.d.ts.map