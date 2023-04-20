/// <reference types="node" />
import type { MessageOrCCLogEntry, SinglecastCC } from "@zwave-js/core/safe";
import { CommandClasses, Maybe } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { AllOrNone } from "@zwave-js/shared/safe";
import { PhysicalCCAPI, PollValueImplementation, POLL_VALUE } from "../lib/API";
import { CCCommandOptions, CommandClass, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { BatteryChargingStatus, BatteryCommand, BatteryReplacementStatus } from "../lib/_Types";
export declare const BatteryCCValues: Readonly<{
    lowTemperatureStatus: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "lowTemperatureStatus";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "lowTemperatureStatus";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Battery temperature is low";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
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
    disconnected: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "disconnected";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "disconnected";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Battery is disconnected";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    rechargeOrReplace: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "rechargeOrReplace";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "rechargeOrReplace";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Recharge or replace";
            readonly states: {
                [x: number]: string;
            };
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    lowFluid: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "lowFluid";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "lowFluid";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Fluid is low";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    overheating: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "overheating";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "overheating";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Overheating";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    backup: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "backup";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "backup";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Used as backup";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    rechargeable: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "rechargeable";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "rechargeable";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Rechargeable";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    chargingStatus: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "chargingStatus";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "chargingStatus";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Charging status";
            readonly states: {
                [x: number]: string;
            };
            readonly writeable: false;
            readonly min: 0;
            readonly max: 255;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    temperature: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "temperature";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "temperature";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Temperature";
            readonly writeable: false;
            readonly min: -128;
            readonly max: 127;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    maximumCapacity: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "maximumCapacity";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "maximumCapacity";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly max: 100;
            readonly unit: "%";
            readonly label: "Maximum capacity";
            readonly writeable: false;
            readonly min: 0;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly supportsEndpoints: true;
            readonly autoCreate: true;
            readonly minVersion: 2;
        };
    };
    isLow: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "isLow";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "isLow";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly label: "Low battery level";
            readonly writeable: false;
            readonly type: "boolean";
            readonly readable: true;
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
    level: {
        readonly id: {
            commandClass: CommandClasses.Battery;
            property: "level";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: CommandClasses.Battery;
            readonly endpoint: number;
            readonly property: "level";
        };
        readonly is: (valueId: import("@zwave-js/core").ValueID) => boolean;
        readonly meta: {
            readonly max: 100;
            readonly unit: "%";
            readonly label: "Battery level";
            readonly writeable: false;
            readonly min: 0;
            readonly type: "number";
            readonly readable: true;
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
}>;
export declare class BatteryCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: BatteryCommand): Maybe<boolean>;
    protected [POLL_VALUE]: PollValueImplementation;
    get(): Promise<Pick<BatteryCCReport, "level" | "isLow" | "chargingStatus" | "rechargeable" | "backup" | "overheating" | "lowFluid" | "rechargeOrReplace" | "disconnected" | "lowTemperatureStatus"> | undefined>;
    getHealth(): Promise<Pick<BatteryCCHealthReport, "maximumCapacity" | "temperature"> | undefined>;
}
export declare class BatteryCC extends CommandClass {
    ccCommand: BatteryCommand;
    interview(applHost: ZWaveApplicationHost): Promise<void>;
    refreshValues(applHost: ZWaveApplicationHost): Promise<void>;
    shouldRefreshValues(this: SinglecastCC<this>, applHost: ZWaveApplicationHost): boolean;
}
export type BatteryCCReportOptions = CCCommandOptions & ({
    isLow?: false;
    level: number;
} | {
    isLow: true;
    level?: undefined;
}) & AllOrNone<{
    chargingStatus: BatteryChargingStatus;
    rechargeable: boolean;
    backup: boolean;
    overheating: boolean;
    lowFluid: boolean;
    rechargeOrReplace: BatteryReplacementStatus;
    disconnected: boolean;
}> & AllOrNone<{
    lowTemperatureStatus: boolean;
}>;
export declare class BatteryCCReport extends BatteryCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | BatteryCCReportOptions);
    readonly level: number;
    readonly isLow: boolean;
    readonly chargingStatus: BatteryChargingStatus | undefined;
    readonly rechargeable: boolean | undefined;
    readonly backup: boolean | undefined;
    readonly overheating: boolean | undefined;
    readonly lowFluid: boolean | undefined;
    readonly rechargeOrReplace: BatteryReplacementStatus | undefined;
    readonly disconnected: boolean | undefined;
    readonly lowTemperatureStatus: boolean | undefined;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BatteryCCGet extends BatteryCC {
}
export declare class BatteryCCHealthReport extends BatteryCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    persistValues(applHost: ZWaveApplicationHost): boolean;
    readonly maximumCapacity: number | undefined;
    readonly temperature: number | undefined;
    private readonly temperatureScale;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class BatteryCCHealthGet extends BatteryCC {
}
//# sourceMappingURL=BatteryCC.d.ts.map