/// <reference types="node" />
import type { IZWaveEndpoint, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { AssociationAddress, EndpointAddress, MultiChannelAssociationCommand } from "../lib/_Types";
export declare const MultiChannelAssociationCCValues: Readonly<{
    endpoints: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel Association"];
            readonly endpoint: number;
            readonly property: "endpoints";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel Association"];
            property: "endpoints";
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
    nodeIds: ((groupId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel Association"];
            readonly endpoint: number;
            readonly property: "nodeIds";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel Association"];
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
            readonly commandClass: (typeof CommandClasses)["Multi Channel Association"];
            readonly endpoint: number;
            readonly property: "maxNodes";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel Association"];
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
            commandClass: (typeof CommandClasses)["Multi Channel Association"];
            property: "groupCount";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel Association"];
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
}>;
export declare class MultiChannelAssociationCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: MultiChannelAssociationCommand): Maybe<boolean>;
    /**
     * Returns the number of association groups a node supports.
     * Association groups are consecutive, starting at 1.
     */
    getGroupCount(): Promise<number | undefined>;
    /**
     * Returns information about an association group.
     */
    getGroup(groupId: number): Promise<Pick<MultiChannelAssociationCCReport, "maxNodes" | "endpoints" | "nodeIds"> | undefined>;
    /**
     * Adds new nodes or endpoints to an association group
     */
    addDestinations(options: MultiChannelAssociationCCSetOptions): Promise<SupervisionResult | undefined>;
    /**
     * Removes nodes or endpoints from an association group
     */
    removeDestinations(options: MultiChannelAssociationCCRemoveOptions): Promise<SupervisionResult | undefined>;
}
export declare class MultiChannelAssociationCC extends CommandClass {
    ccCommand: MultiChannelAssociationCommand;
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
type MultiChannelAssociationCCSetOptions = {
    groupId: number;
} & ({
    nodeIds: number[];
} | {
    endpoints: EndpointAddress[];
} | {
    nodeIds: number[];
    endpoints: EndpointAddress[];
});
export declare class MultiChannelAssociationCCSet extends MultiChannelAssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (MultiChannelAssociationCCSetOptions & CCCommandOptions));
    groupId: number;
    nodeIds: number[];
    endpoints: EndpointAddress[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultiChannelAssociationCCRemoveOptions {
    /** The group from which to remove the nodes. If none is specified, the nodes will be removed from all groups. */
    groupId?: number;
    /** The nodes to remove. If no nodeIds and no endpoint addresses are specified, ALL nodes will be removed. */
    nodeIds?: number[];
    /** The single endpoints to remove. If no nodeIds and no endpoint addresses are specified, ALL will be removed. */
    endpoints?: EndpointAddress[];
}
export declare class MultiChannelAssociationCCRemove extends MultiChannelAssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (MultiChannelAssociationCCRemoveOptions & CCCommandOptions));
    groupId?: number;
    nodeIds?: number[];
    endpoints?: EndpointAddress[];
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultiChannelAssociationCCReport extends MultiChannelAssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly groupId: number;
    readonly maxNodes: number;
    private _nodeIds;
    get nodeIds(): readonly number[];
    private _endpoints;
    get endpoints(): readonly EndpointAddress[];
    readonly reportsToFollow: number;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: MultiChannelAssociationCCReport[]): void;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultiChannelAssociationCCGetOptions extends CCCommandOptions {
    groupId: number;
}
export declare class MultiChannelAssociationCCGet extends MultiChannelAssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelAssociationCCGetOptions);
    groupId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultiChannelAssociationCCSupportedGroupingsReport extends MultiChannelAssociationCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly groupCount: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultiChannelAssociationCCSupportedGroupingsGet extends MultiChannelAssociationCC {
}
export {};
//# sourceMappingURL=MultiChannelAssociationCC.d.ts.map