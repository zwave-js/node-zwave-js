/// <reference types="node" />
import { CommandClasses, Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { BinarySensorCommand, BinarySensorType } from "../lib/_Types";
export declare const BinarySensorCCValues: Readonly<{
    state: ((sensorType: BinarySensorType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Binary Sensor"];
            readonly endpoint: number;
            readonly property: string;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Binary Sensor"];
            property: string;
        };
        readonly meta: {
            readonly label: `Sensor state (${string})`;
            readonly ccSpecific: {
                readonly sensorType: BinarySensorType;
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
    supportedSensorTypes: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Binary Sensor"];
            property: "supportedSensorTypes";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Binary Sensor"];
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
}>;
export declare class BinarySensorCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: BinarySensorCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    /**
     * Retrieves the current value from this sensor
     * @param sensorType The (optional) sensor type to retrieve the value for
     */
    get(sensorType?: BinarySensorType): Promise<boolean | undefined>;
    getSupportedSensorTypes(): Promise<readonly BinarySensorType[] | undefined>;
}
export declare class BinarySensorCC extends CommandClass {
    ccCommand: BinarySensorCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    setMappedBasicValue(applHost: ZWaveApplicationHost, value: number): boolean;
}
export declare class BinarySensorCCReport extends BinarySensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    private _type;
    get type(): BinarySensorType;
    private _value;
    get value(): boolean;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface BinarySensorCCGetOptions extends CCCommandOptions {
    sensorType?: BinarySensorType;
}
export declare class BinarySensorCCGet extends BinarySensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BinarySensorCCGetOptions);
    sensorType: BinarySensorType | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BinarySensorCCSupportedReport extends BinarySensorCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly supportedSensorTypes: readonly BinarySensorType[];
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BinarySensorCCSupportedGet extends BinarySensorCC {
}
export {};
//# sourceMappingURL=BinarySensorCC.d.ts.map