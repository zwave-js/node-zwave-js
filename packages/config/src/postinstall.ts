import { ConfigManager } from "./ConfigManager";

(async () => {
	const configManager = new ConfigManager();
	console.log("generating device configuration index...");
	await configManager.generateDeviceIndex();
})().catch(() => process.exit(1));
