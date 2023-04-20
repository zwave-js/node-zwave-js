/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { AlarmSensorCommand, AlarmSensorType } from "../lib/_Types";
export declare const AlarmSensorCCValues: Readonly<{
    supportedSensorTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Alarm Sensor"];
            property: "supportedSensorTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Alarm Sensor"];
            readonly endpoint: number;
            readonly property: "supportedSensorTypes";
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
    duration: ((sensorType: AlarmSensorType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Alarm Sensor"];
            readonly endpoint: number;
            readonly property: "duration";
            readonly propertyKey: AlarmSensorType;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Alarm Sensor"];
            property: "duration";
            propertyKey: AlarmSensorType;
        };
        readonly meta: {
            readonly unit: "s";
            readonly label: `${string} duration`;
            readonly description: "For how long the alarm should be active";
            readonly ccSpecific: {
                readonly sensorType: AlarmSensorType;
            };
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
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
    severity: ((sensorType: AlarmSensorType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Alarm Sensor"];
            readonly endpoint: number;
            readonly property: "severity";
            readonly propertyKey: AlarmSensorType;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Alarm Sensor"];
            property: "severity";
            propertyKey: AlarmSensorType;
        };
        readonly meta: {
            readonly min: 1;
            readonly max: 100;
            readonly unit: "%";
            readonly label: `${string} severity`;
            readonly ccSpecific: {
                readonly sensorType: AlarmSensorType;
            };
            readonly writeable: false;
            readonly type: "number";
            readonly readable: true;
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
    state: ((sensorType: AlarmSensorType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Alarm Sensor"];
            readonly endpoint: number;
            readonly property: "state";
            readonly propertyKey: AlarmSensorType;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Alarm Sensor"];
            property: "state";
            propertyKey: AlarmSensorType;
        };
        readonly meta: {
            readonly label: `${string} state`;
            readonly description: "Whether the alarm is active";
            readonly ccSpecific: {
                readonly sensorType: AlarmSensorType;
            };
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
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
}>;
export declare class AlarmSensorCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: AlarmSensorCommand): Maybe<boolean>;
    /**
     * Retrieves the current value from this sensor
     * @param sensorType The (optional) sensor type to retrieve the value for
     */
    get(sensorType?: AlarmSensorType): Promise<Pick<AlarmSensorCCReport, "duration" | "state" | "severity"> | undefined>;
    getSupportedSensorTypes(): Promise<readonly AlarmSensorType[] | undefined>;
}
export declare class AlarmSensorCC extends CommandClass {
    ccCommand: AlarmSensorCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    protected createMetadataForSensorType(applHost: ZWaveApplicationHost, sensorType: AlarmSensorType): void;
}
export declare class AlarmSensorCCReport extends AlarmSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly sensorType: AlarmSensorType;
    readonly state: boolean;
    readonly severity: number | undefined;
    readonly duration: number | undefined;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
    persistValues(applHost: ZWaveApplicationHost): boolean;
}
interface AlarmSensorCCGetOptions extends CCCommandOptions {
    sensorType?: AlarmSensorType;
}
export declare class AlarmSensorCCGet extends AlarmSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | AlarmSensorCCGetOptions);
    sensorType: AlarmSensorType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class AlarmSensorCCSupportedReport extends AlarmSensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    private _supportedSensorTypes;
    get supportedSensorTypes(): readonly AlarmSensorType[];
    persistValues(applHost: ZWaveApplicationHost): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class AlarmSensorCCSupportedGet extends AlarmSensorCC {
}
export {};
//# sourceMappingURL=AlarmSensorCC.d.ts.map