import { loadDeviceIndexInternal } from "../src/Devices";

export async function generateDeviceIndex(): Promise<void> {
	await loadDeviceIndexInternal();
}
