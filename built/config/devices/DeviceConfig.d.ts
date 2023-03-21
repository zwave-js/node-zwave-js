import { JSONObject, ReadonlyObjectKeyMap } from "@zwave-js/shared";
import { ConditionalAssociationConfig, type AssociationConfig } from "./AssociationConfig";
import { CompatConfig, ConditionalCompatConfig } from "./CompatConfig";
import { ConditionalPrimitive } from "./ConditionalPrimitive";
import { ConditionalDeviceMetadata, type DeviceMetadata } from "./DeviceMetadata";
import { ConditionalEndpointConfig, EndpointConfig } from "./EndpointConfig";
import { ConditionalParamInformation, ParamInformation } from "./ParamInformation";
import type { DeviceID, FirmwareVersionRange } from "./shared";
export interface DeviceConfigIndexEntry {
    manufacturerId: string;
    productType: string;
    productId: string;
    firmwareVersion: FirmwareVersionRange;
    rootDir?: string;
    filename: string;
}
export interface FulltextDeviceConfigIndexEntry {
    manufacturerId: string;
    manufacturer: string;
    label: string;
    description: string;
    productType: string;
    productId: string;
    firmwareVersion: FirmwareVersionRange;
    rootDir?: string;
    filename: string;
}
export type ConditionalParamInfoMap = ReadonlyObjectKeyMap<{
    parameter: number;
    valueBitMask?: number;
}, ConditionalParamInformation[]>;
export type ParamInfoMap = ReadonlyObjectKeyMap<{
    parameter: number;
    valueBitMask?: number;
}, ParamInformation>;
export declare const embeddedDevicesDir: string;
export declare function getDevicesPaths(configDir: string): {
    devicesDir: string;
    indexPath: string;
};
export type DeviceConfigIndex = DeviceConfigIndexEntry[];
export type FulltextDeviceConfigIndex = FulltextDeviceConfigIndexEntry[];
/** This class represents a device config entry whose conditional settings have not been evaluated yet */
export declare class ConditionalDeviceConfig {
    static from(filename: string, isEmbedded: boolean, options: {
        rootDir: string;
        relative?: boolean;
    }): Promise<ConditionalDeviceConfig>;
    constructor(filename: string, isEmbedded: boolean, definition: JSONObject);
    readonly filename: string;
    readonly manufacturer: ConditionalPrimitive<string>;
    readonly manufacturerId: number;
    readonly label: ConditionalPrimitive<string>;
    readonly description: ConditionalPrimitive<string>;
    readonly devices: readonly {
        productType: number;
        productId: number;
    }[];
    readonly firmwareVersion: FirmwareVersionRange;
    readonly endpoints?: ReadonlyMap<number, ConditionalEndpointConfig>;
    readonly associations?: ReadonlyMap<number, ConditionalAssociationConfig>;
    readonly paramInformation?: ConditionalParamInfoMap;
    /**
     * Contains manufacturer-specific support information for the
     * ManufacturerProprietary CC
     */
    readonly proprietary?: Record<string, unknown>;
    /** Contains compatibility options */
    readonly compat?: ConditionalCompatConfig | ConditionalCompatConfig[];
    /** Contains instructions and other metadata for the device */
    readonly metadata?: ConditionalDeviceMetadata;
    /** Whether this is an embedded configuration or not */
    readonly isEmbedded: boolean;
    evaluate(deviceId?: DeviceID): DeviceConfig;
}
export declare class DeviceConfig {
    readonly filename: string;
    /** Whether this is an embedded configuration or not */
    readonly isEmbedded: boolean;
    readonly manufacturer: string;
    readonly manufacturerId: number;
    readonly label: string;
    readonly description: string;
    readonly devices: readonly {
        productType: number;
        productId: number;
    }[];
    readonly firmwareVersion: FirmwareVersionRange;
    readonly endpoints?: ReadonlyMap<number, EndpointConfig> | undefined;
    readonly associations?: ReadonlyMap<number, AssociationConfig> | undefined;
    readonly paramInformation?: ParamInfoMap | undefined;
    /**
     * Contains manufacturer-specific support information for the
     * ManufacturerProprietary CC
     */
    readonly proprietary?: Record<string, unknown> | undefined;
    /** Contains compatibility options */
    readonly compat?: CompatConfig | undefined;
    /** Contains instructions and other metadata for the device */
    readonly metadata?: DeviceMetadata | undefined;
    static from(filename: string, isEmbedded: boolean, options: {
        rootDir: string;
        relative?: boolean;
        deviceId?: DeviceID;
    }): Promise<DeviceConfig>;
    constructor(filename: string, 
    /** Whether this is an embedded configuration or not */
    isEmbedded: boolean, manufacturer: string, manufacturerId: number, label: string, description: string, devices: readonly {
        productType: number;
        productId: number;
    }[], firmwareVersion: FirmwareVersionRange, endpoints?: ReadonlyMap<number, EndpointConfig> | undefined, associations?: ReadonlyMap<number, AssociationConfig> | undefined, paramInformation?: ParamInfoMap | undefined, 
    /**
     * Contains manufacturer-specific support information for the
     * ManufacturerProprietary CC
     */
    proprietary?: Record<string, unknown> | undefined, 
    /** Contains compatibility options */
    compat?: CompatConfig | undefined, 
    /** Contains instructions and other metadata for the device */
    metadata?: DeviceMetadata | undefined);
    /** Returns the association config for a given endpoint */
    getAssociationConfigForEndpoint(endpointIndex: number, group: number): AssociationConfig | undefined;
}
//# sourceMappingURL=DeviceConfig.d.ts.map