/// <reference types="node" />
import type { IZWaveEndpoint, Maybe, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { AssociationCommand, type AssociationAddress } from "../lib/_Types";
export declare const AssociationCCValues: Readonly<{
    nodeIds: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Association;
            readonly endpoint: number;
            readonly property: "nodeIds";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: CommandClasses.Association;
            property: "nodeIds";
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
    maxNodes: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Association;
            readonly endpoint: number;
            readonly property: "maxNodes";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: CommandClasses.Association;
            property: "maxNodes";
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
    groupCount: {
        readonly id: {
            commandClass: CommandClasses.Association;
            property: "groupCount";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Association;
            readonly endpoint: number;
            readonly property: "groupCount";
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
    hasLifeline: {
        readonly id: {
            commandClass: CommandClasses.Association;
            property: "hasLifeline";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Association;
            readonly endpoint: number;
            readonly property: "hasLifeline";
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
export declare function getLifelineGroupIds(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number[];
export declare class AssociationCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: AssociationCommand): Maybe<boolean>;
    /**
     * Returns the number of association groups a node supports.
     * Association groups are consecutive, starting at 1.
     */
    getGroupCount(): Promise<number | undefined>;
    /**
     * Returns information about an association group.
     */
    getGroup(groupId: number): Promise<{
        maxNodes: number;
        nodeIds: readonly number[];
    } | undefined>;
    /**
     * Adds new nodes to an association group
     */
    addNodeIds(groupId: number, ...nodeIds: number[]): Promise<SupervisionResult | undefined>;
    /**
     * Removes nodes from an association group
     */
    removeNodeIds(options: AssociationCCRemoveOptions): Promise<SupervisionResult | undefined>;
    /**
     * Removes nodes from all association groups
     */
    removeNodeIdsFromAllGroups(nodeIds: number[]): Promise<SupervisionResult | undefined>;
}
export declare class AssociationCC extends CommandClass {
    ccCommand: AssociationCommand;
    determineRequiredCCInterviews(): readonly CommandClasses[];
    /**
     * Returns the number of association groups reported by the node/endpoint.
     * This only works AFTER the interview process
     */
    static getGroupCountCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): number;
    /**
     * Returns the number of nodes an association group supports.
     * This only works AFTER the interview process
     */
    static getMaxNodesCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint, groupId: number): number;
    /**
     * Returns all the destinations of all association groups reported by the node/endpoint.
     * This only works AFTER the interview process
     */
    static getAllDestinationsCached(applHost: ZWaveApplicationHost, endpoint: IZWaveEndpoint): ReadonlyMap<number, readonly AssociationAddress[]>;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
}
interface AssociationCCSetOptions extends CCCommandOptions {
    groupId: number;
    nodeIds: number[];
}
export declare class AssociationCCSet extends AssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | AssociationCCSetOptions);
    groupId: number;
    nodeIds: number[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface AssociationCCRemoveOptions {
    /** The group from which to remove the nodes. If none is specified, the nodes will be removed from all nodes. */
    groupId?: number;
    /** The nodes to remove. If none are specified, ALL nodes will be removed. */
    nodeIds?: number[];
}
export declare class AssociationCCRemove extends AssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (AssociationCCRemoveOptions & CCCommandOptions));
    groupId?: number;
    nodeIds?: number[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class AssociationCCReport extends AssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    private _groupId;
    get groupId(): number;
    private _maxNodes;
    get maxNodes(): number;
    private _nodeIds;
    get nodeIds(): readonly number[];
    private _reportsToFollow;
    get reportsToFollow(): number;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: AssociationCCReport[]): void;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface AssociationCCGetOptions extends CCCommandOptions {
    groupId: number;
}
export declare class AssociationCCGet extends AssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | AssociationCCGetOptions);
    groupId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class AssociationCCSupportedGroupingsReport extends AssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    private _groupCount;
    get groupCount(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class AssociationCCSupportedGroupingsGet extends AssociationCC {
}
export {};
//# sourceMappingURL=AssociationCC.d.ts.map