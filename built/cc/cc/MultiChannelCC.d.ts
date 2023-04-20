/// <reference types="node" />
import type { GenericDeviceClass, SpecificDeviceClass } from "@zwave-js/config";
import { ApplicationNodeInformation, CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { MultiChannelCommand } from "../lib/_Types";
export declare const MultiChannelCCValues: Readonly<{
    aggregatedEndpointMembers: ((endpointIndex: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "members";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "members";
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
    endpointDeviceClass: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "deviceClass";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "deviceClass";
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
    endpointCCs: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "commandClasses";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "commandClasses";
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
    endpointsHaveIdenticalCapabilities: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "identicalCapabilities";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "identicalCapabilities";
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
    endpointCountIsDynamic: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "countIsDynamic";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "countIsDynamic";
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
    aggregatedEndpointCount: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "aggregatedCount";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "aggregatedCount";
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
    individualEndpointCount: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "individualCount";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "individualCount";
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
    endpointIndizes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multi Channel"];
            property: "endpointIndizes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multi Channel"];
            readonly endpoint: number;
            readonly property: "endpointIndizes";
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
}>;
export declare class MultiChannelCCAPI extends CCAPI {
    supportsCommand(cmd: MultiChannelCommand): Maybe<boolean>;
    getEndpoints(): Promise<{
        isDynamicEndpointCount: boolean;
        identicalCapabilities: boolean;
        individualEndpointCount: number;
        aggregatedEndpointCount: number | undefined;
    } | undefined>;
    getEndpointCapabilities(endpoint: number): Promise<EndpointCapability | undefined>;
    findEndpoints(genericClass: number, specificClass: number): Promise<readonly number[] | undefined>;
    getAggregatedMembers(endpoint: number): Promise<readonly number[] | undefined>;
    sendEncapsulated(options: Omit<MultiChannelCCCommandEncapsulationOptions, keyof CCCommandOptions>): Promise<void>;
    getEndpointCountV1(ccId: CommandClasses): Promise<number | undefined>;
    sendEncapsulatedV1(encapsulated: CommandClass): Promise<void>;
}
export interface EndpointCapability {
    generic: GenericDeviceClass;
    specific: SpecificDeviceClass;
    supportedCCs: CommandClasses[];
    isDynamic: boolean;
    wasRemoved: boolean;
}
export declare class MultiChannelCC extends CommandClass {
    ccCommand: MultiChannelCommand;
    /** Tests if a command targets a specific endpoint and thus requires encapsulation */
    static requiresEncapsulation(cc: CommandClass): boolean;
    /** Encapsulates a command that targets a specific endpoint */
    static encapsulate(host: ZWaveHost, cc: CommandClass): MultiChannelCCCommandEncapsulation | MultiChannelCCV1CommandEncapsulation;
    skipEndpointInterview(): boolean;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    private interviewV1;
}
export interface MultiChannelCCEndPointReportOptions extends CCCommandOptions {
    countIsDynamic: boolean;
    identicalCapabilities: boolean;
    individualCount: number;
    aggregatedCount?: number;
}
export declare class MultiChannelCCEndPointReport extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCEndPointReportOptions);
    countIsDynamic: boolean;
    identicalCapabilities: boolean;
    individualCount: number;
    aggregatedCount: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultiChannelCCEndPointGet extends MultiChannelCC {
}
export interface MultiChannelCCCapabilityReportOptions extends CCCommandOptions {
    endpointIndex: number;
    genericDeviceClass: number;
    specificDeviceClass: number;
    supportedCCs: CommandClasses[];
    isDynamic: boolean;
    wasRemoved: boolean;
}
export declare class MultiChannelCCCapabilityReport extends MultiChannelCC implements ApplicationNodeInformation {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCCapabilityReportOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly endpointIndex: number;
    readonly genericDeviceClass: number;
    readonly specificDeviceClass: number;
    readonly supportedCCs: CommandClasses[];
    readonly isDynamic: boolean;
    readonly wasRemoved: boolean;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultiChannelCCCapabilityGetOptions extends CCCommandOptions {
    requestedEndpoint: number;
}
export declare class MultiChannelCCCapabilityGet extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCCapabilityGetOptions);
    requestedEndpoint: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export interface MultiChannelCCEndPointFindReportOptions extends CCCommandOptions {
    genericClass: number;
    specificClass: number;
    foundEndpoints: number[];
    reportsToFollow: number;
}
export declare class MultiChannelCCEndPointFindReport extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCEndPointFindReportOptions);
    genericClass: number;
    specificClass: number;
    foundEndpoints: number[];
    reportsToFollow: number;
    serialize(): Buffer;
    getPartialCCSessionId(): Record<string, any> | undefined;
    expectMoreMessages(): boolean;
    mergePartialCCs(applHost: ZWaveApplicationHost, partials: MultiChannelCCEndPointFindReport[]): void;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultiChannelCCEndPointFindOptions extends CCCommandOptions {
    genericClass: number;
    specificClass: number;
}
export declare class MultiChannelCCEndPointFind extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCEndPointFindOptions);
    genericClass: number;
    specificClass: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultiChannelCCAggregatedMembersReport extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly aggregatedEndpointIndex: number;
    readonly members: readonly number[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultiChannelCCAggregatedMembersGetOptions extends CCCommandOptions {
    requestedEndpoint: number;
}
export declare class MultiChannelCCAggregatedMembersGet extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCAggregatedMembersGetOptions);
    requestedEndpoint: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
type MultiChannelCCDestination = number | (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
interface MultiChannelCCCommandEncapsulationOptions extends CCCommandOptions {
    encapsulated: CommandClass;
    destination: MultiChannelCCDestination;
}
export declare class MultiChannelCCCommandEncapsulation extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCCommandEncapsulationOptions);
    encapsulated: CommandClass;
    /** The destination end point (0-127) or an array of destination end points (1-7) */
    destination: MultiChannelCCDestination;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
    protected computeEncapsulationOverhead(): number;
}
export declare class MultiChannelCCV1Report extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly requestedCC: CommandClasses;
    readonly endpointCount: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultiChannelCCV1GetOptions extends CCCommandOptions {
    requestedCC: CommandClasses;
}
export declare class MultiChannelCCV1Get extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCV1GetOptions);
    requestedCC: CommandClasses;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultiChannelCCV1CommandEncapsulationOptions extends CCCommandOptions {
    encapsulated: CommandClass;
}
export declare class MultiChannelCCV1CommandEncapsulation extends MultiChannelCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultiChannelCCV1CommandEncapsulationOptions);
    encapsulated: CommandClass;
    serialize(): Buffer;
    protected computeEncapsulationOverhead(): number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=MultiChannelCC.d.ts.map