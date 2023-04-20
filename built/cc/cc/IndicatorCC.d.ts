/// <reference types="node" />
import type { MessageOrCCLogEntry, SupervisionResult } from "@zwave-js/core/safe";
import { CommandClasses, Maybe } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { CCAPI, PollValueImplementation, POLL_VALUE, SetValueImplementation, SET_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { IndicatorCommand } from "../lib/_Types";
export declare const IndicatorCCValues: Readonly<{
    indicatorDescription: ((indicatorId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Indicator;
            readonly endpoint: number;
            readonly property: number;
        };
        readonly id: {
            commandClass: CommandClasses.Indicator;
            property: number;
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
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
            readonly minVersion: 4;
        };
    };
    valueV2: ((indicatorId: number, propertyId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Indicator;
            readonly endpoint: number;
            readonly property: number;
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: CommandClasses.Indicator;
            property: number;
            propertyKey: number;
        };
        readonly meta: {
            readonly ccSpecific: {
                indicatorId: number;
                propertyId: number;
            };
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    supportedPropertyIDs: ((indicatorId: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Indicator;
            readonly endpoint: number;
            readonly property: "supportedPropertyIDs";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: CommandClasses.Indicator;
            property: "supportedPropertyIDs";
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
    identify: {
        readonly id: {
            commandClass: CommandClasses.Indicator;
            property: "identify";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Indicator;
            readonly endpoint: number;
            readonly property: "identify";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Identify";
            readonly readable: false;
            readonly type: "boolean";
            readonly writeable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 3;
        };
    };
    valueV1: {
        readonly id: {
            commandClass: CommandClasses.Indicator;
            property: "value";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Indicator;
            readonly endpoint: number;
            readonly property: "value";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Indicator value";
            readonly ccSpecific: {
                readonly indicatorId: 0;
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
    supportedIndicatorIds: {
        readonly id: {
            commandClass: CommandClasses.Indicator;
            property: "supportedIndicatorIds";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Indicator;
            readonly endpoint: number;
            readonly property: "supportedIndicatorIds";
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
export declare class IndicatorCCAPI extends CCAPI {
    supportsCommand(cmd: IndicatorCommand): Maybe<boolean>;
    protected [SET_VALUE]: SetValueImplementation;
    protected [POLL_VALUE]: PollValueImplementation;
    get(indicatorId?: number): Promise<number | IndicatorObject[] | undefined>;
    set(value: number | IndicatorObject[]): Promise<SupervisionResult | undefined>;
    getSupported(indicatorId: number): Promise<{
        indicatorId?: number;
        supportedProperties: readonly number[];
        nextIndicatorId: number;
    } | undefined>;
    /**
     * Instructs the node to identify itself. Available starting with V3 of this CC.
     */
    identify(): Promise<SupervisionResult | undefined>;
    getDescription(indicatorId: number): Promise<string | undefined>;
}
export declare class IndicatorCC extends CommandClass {
    ccCommand: IndicatorCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    translatePropertyKey(applHost: ZWaveApplicationHost, property: string | number, propertyKey: string | number): string | undefined;
    translateProperty(applHost: ZWaveApplicationHost, property: string | number, propertyKey?: string | number): string;
    protected supportsV2Indicators(applHost: ZWaveApplicationHost): boolean;
}
export interface IndicatorObject {
    indicatorId: number;
    propertyId: number;
    value: number | boolean;
}
type IndicatorCCSetOptions = {
    value: number;
} | {
    values: IndicatorObject[];
};
export declare class IndicatorCCSet extends IndicatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | (IndicatorCCSetOptions & CCCommandOptions));
    indicator0Value: number | undefined;
    values: IndicatorObject[] | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IndicatorCCReport extends IndicatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly value: number | undefined;
    readonly values: IndicatorObject[] | undefined;
    private setIndicatorValue;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IndicatorCCGetOptions extends CCCommandOptions {
    indicatorId?: number;
}
export declare class IndicatorCCGet extends IndicatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IndicatorCCGetOptions);
    indicatorId: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IndicatorCCSupportedReport extends IndicatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly indicatorId: number;
    readonly nextIndicatorId: number;
    readonly supportedProperties: readonly number[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IndicatorCCSupportedGetOptions extends CCCommandOptions {
    indicatorId: number;
}
export declare class IndicatorCCSupportedGet extends IndicatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IndicatorCCSupportedGetOptions);
    indicatorId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class IndicatorCCDescriptionReport extends IndicatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    indicatorId: number;
    description: string;
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface IndicatorCCDescriptionGetOptions extends CCCommandOptions {
    indicatorId: number;
}
export declare class IndicatorCCDescriptionGet extends IndicatorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | IndicatorCCDescriptionGetOptions);
    indicatorId: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=IndicatorCC.d.ts.map