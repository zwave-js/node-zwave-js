/// <reference types="node" />
import type { Maybe, MessageOrCCLogEntry } from "@zwave-js/core/safe";
import { CommandClasses } from "@zwave-js/core/safe";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host/safe";
import { PhysicalCCAPI } from "../lib/API";
import { CommandClass, type CCCommandOptions, type CommandClassDeserializationOptions } from "../lib/CommandClass";
import { DeviceIdType, ManufacturerSpecificCommand } from "../lib/_Types";
export declare const ManufacturerSpecificCCValues: Readonly<{
    deviceId: ((type: DeviceIdType) => {
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            readonly endpoint: number;
            readonly property: "deviceId";
            readonly propertyKey: string;
        };
        readonly id: {
            commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            property: "deviceId";
            propertyKey: string;
        };
        readonly meta: {
            readonly label: string;
            readonly writeable: false;
            readonly type: "string";
            readonly readable: true;
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
    productId: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            property: "productId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            readonly endpoint: number;
            readonly property: "productId";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Product ID";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 65535;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
    productType: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            property: "productType";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            readonly endpoint: number;
            readonly property: "productType";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Product type";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 65535;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
    manufacturerId: {
        readonly id: {
            commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            property: "manufacturerId";
        };
        readonly endpoint: (endpoint?: number | undefined) => {
            readonly commandClass: (typeof CommandClasses)["Manufacturer Specific"];
            readonly endpoint: number;
            readonly property: "manufacturerId";
        };
        readonly is: (valueId: import("@zwave-js/core/safe").ValueID) => boolean;
        readonly meta: {
            readonly label: "Manufacturer ID";
            readonly writeable: false;
            readonly min: 0;
            readonly max: 65535;
            readonly type: "number";
            readonly readable: true;
        };
        readonly options: {
            readonly internal: false;
            readonly stateful: true;
            readonly secret: false;
            readonly minVersion: 1;
            readonly autoCreate: true;
            readonly supportsEndpoints: false;
        };
    };
}>;
export declare class ManufacturerSpecificCCAPI extends PhysicalCCAPI {
    supportsCommand(cmd: ManufacturerSpecificCommand): Maybe<boolean>;
    get(): Promise<Pick<ManufacturerSpecificCCReport, "manufacturerId" | "productType" | "productId"> | undefined>;
    deviceSpecificGet(deviceIdType: DeviceIdType): Promise<string | undefined>;
}
export declare class ManufacturerSpecificCC extends CommandClass {
    ccCommand: ManufacturerSpecificCommand;
    determineRequiredCCInterviews(): readonly CommandClasses[];
    interview(applHost: ZWaveApplicationHost): Promise<void>;
}
export declare class ManufacturerSpecificCCReport extends ManufacturerSpecificCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly manufacturerId: number;
    readonly productType: number;
    readonly productId: number;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export declare class ManufacturerSpecificCCGet extends ManufacturerSpecificCC {
}
export declare class ManufacturerSpecificCCDeviceSpecificReport extends ManufacturerSpecificCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions);
    readonly type: DeviceIdType;
    readonly deviceId: string;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
interface ManufacturerSpecificCCDeviceSpecificGetOptions extends CCCommandOptions {
    deviceIdType: DeviceIdType;
}
export declare class ManufacturerSpecificCCDeviceSpecificGet extends ManufacturerSpecificCC {
    constructor(host: ZWaveHost, options: CommandClassDeserializationOptions | ManufacturerSpecificCCDeviceSpecificGetOptions);
    deviceIdType: DeviceIdType;
    serialize(): Buffer;
    toLogEntry(applHost: ZWaveApplicationHost): MessageOrCCLogEntry;
}
export {};
//# sourceMappingURL=ManufacturerSpecificCC.d.ts.map