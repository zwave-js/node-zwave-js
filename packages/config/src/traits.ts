import { type DeviceConfig } from "./devices/DeviceConfig.js";

/** Allows querying device configuration for a node */
export interface GetDeviceConfig {
	getDeviceConfig(nodeId: number): DeviceConfig | undefined;
}

/** Allows looking up Z-Wave manufacturers by manufacturer ID */
export interface LookupManufacturer {
	/** Looks up the name of the manufacturer with the given ID in the configuration DB */
	lookupManufacturer(manufacturerId: number): string | undefined;
}
