import { type DeviceConfig } from "./devices/DeviceConfig.js";

/** Allows querying device configuration for a node */
export interface GetDeviceConfig {
	getDeviceConfig(nodeId: number): DeviceConfig | undefined;
}
