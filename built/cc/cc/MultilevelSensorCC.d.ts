/// <reference types="node" />
import { Scale } from "@zwave-js/config";
import type { MessageOrCCLogEntry, SinglecastCC, SupervisionResult, ValueID } from "@zwave-js/core/safe";
import { CommandClasses, Maybe } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { MultilevelSensorCommand, MultilevelSensorValue } from "../lib/_Types";
export declare const MultilevelSensorCCValues: Readonly<{
    value: ((sensorTypeName: string) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Sensor"];
            readonly endpoint: number;
            readonly property: string;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Sensor"];
            property: string;
        };
        readonly meta: {
            readonly label: string;
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly internal: false;
            readonly minVersion: 1;
            readonly secret: false;
            readonly stateful: true;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
        };
    };
    supportedScales: ((sensorType: number) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Sensor"];
            readonly endpoint: number;
            readonly property: "supportedScales";
            readonly propertyKey: number;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Sensor"];
            property: "supportedScales";
            propertyKey: number;
        };
        readonly meta: {
            readonly type: "any";
            readonly readable: true;
            readonly writeable: true;
        };
    }) & {
        is: (valueId: ValueID) => boolean;
        readonly options: {
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly internal: true;
        };
    };
    supportedSensorTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Multilevel Sensor"];
            property: "supportedSensorTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Multilevel Sensor"];
            readonly endpoint: number;
            readonly property: "supportedSensorTypes";
        };
        readonly is: (valueId: ValueID) => boolean;
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
export declare class MultilevelSensorCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: MultilevelSensorCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    /** Query the default sensor value */
    get(): Promise<(MultilevelSensorValue & {
        type: number;
    }) | undefined>;
    /** Query the sensor value for the given sensor type using the preferred sensor scale */
    get(sensorType: number): Promise<MultilevelSensorValue | undefined>;
    /** Query the sensor value for the given sensor type using the given sensor scale */
    get(sensorType: number, scale: number): Promise<number | undefined>;
    getSupportedSensorTypes(): Promise<readonly number[] | undefined>;
    getSupportedScales(sensorType: number): Promise<readonly number[] | undefined>;
    sendReport(sensorType: number, scale: number | Scale, value: number): Promise<SupervisionResult | undefined>;
}
export declare class MultilevelSensorCC extends CommandClass {
    ccCommand: MultilevelSensorCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    shouldRefreshValues(this: SinglecastCC<this>, applHost: ZWaveApplicationHost): boolean;
    translatePropertyKey(applHost: ZWaveApplicationHost, property: string | number, propertyKey: string | number): string | undefined;
}
export interface MultilevelSensorCCReportOptions extends CCCommandOptions {
    type: number;
    scale: number | Scale;
    value: number;
}
export declare class MultilevelSensorCCReport extends MultilevelSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultilevelSensorCCReportOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    type: number;
    scale: number;
    value: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultilevelSensorCCGetSpecificOptions {
    sensorType: number;
    scale: number;
}
type MultilevelSensorCCGetOptions = CCCommandOptions | (CCCommandOptions & MultilevelSensorCCGetSpecificOptions);
export declare class MultilevelSensorCCGet extends MultilevelSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultilevelSensorCCGetOptions);
    sensorType: number | undefined;
    scale: number | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultilevelSensorCCSupportedSensorReport extends MultilevelSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedSensorTypes: readonly number[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class MultilevelSensorCCGetSupportedSensor extends MultilevelSensorCC {
}
export declare class MultilevelSensorCCSupportedScaleReport extends MultilevelSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly sensorType: number;
    readonly supportedScales: readonly number[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface MultilevelSensorCCGetSupportedScaleOptions extends CCCommandOptions {
    sensorType: number;
}
export declare class MultilevelSensorCCGetSupportedScale extends MultilevelSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | MultilevelSensorCCGetSupportedScaleOptions);
    sensorType: number;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=MultilevelSensorCC.d.ts.map