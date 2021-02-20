import "esbuild-runner/register";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ConfigManager } from "../packages/config/src/ConfigManager";

export default function setup(): Promise<void> {
	// Regenerate the device index before all tests to avoid race conditions and
	// failing tests due to an outdated index
	const configManager = new ConfigManager();
	return configManager.loadDeviceIndex();
}
