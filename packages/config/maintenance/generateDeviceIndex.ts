import { ConfigManager } from "../src/ConfigManager";

const configManager = new ConfigManager();

export async function generateDeviceIndex(): Promise<void> {
	await configManager.loadDeviceIndex();
}
