import { CommandClasses } from "@zwave-js/core/safe";
import { JSONObject } from "@zwave-js/shared/safe";
export type BasicDeviceClassMap = ReadonlyMap<number, string>;
export type GenericDeviceClassMap = ReadonlyMap<number, GenericDeviceClass>;
export declare function getDefaultGenericDeviceClass(key: number): GenericDeviceClass;
export declare function getDefaultSpecificDeviceClass(generic: GenericDeviceClass, key: number): SpecificDeviceClass;
export interface BasicDeviceClass {
    key: number;
    label: string;
}
export declare class GenericDeviceClass {
    constructor(key: number, definition: JSONObject);
    readonly key: number;
    readonly label: string;
    readonly requiresSecurity?: boolean;
    readonly supportedCCs: readonly CommandClasses[];
    readonly controlledCCs: readonly CommandClasses[];
    readonly specific: ReadonlyMap<number, SpecificDeviceClass>;
}
export declare class SpecificDeviceClass {
    constructor(key: number, definition: JSONObject, generic: GenericDeviceClass);
    readonly key: number;
    readonly label: string;
    readonly zwavePlusDeviceType?: string;
    readonly requiresSecurity?: boolean;
    readonly supportedCCs: readonly CommandClasses[];
    readonly controlledCCs: readonly CommandClasses[];
}
//# sourceMappingURL=DeviceClasses.d.ts.map