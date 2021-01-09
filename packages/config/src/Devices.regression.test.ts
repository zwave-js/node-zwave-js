import { ConfigManager } from "./ConfigManager";

describe("lib/config/Devices", () => {
	describe("lookupDevice (regression tests)", () => {
		let configManager: ConfigManager;

		beforeAll(async () => {
			configManager = new ConfigManager();
			await configManager.loadDeviceIndex();
		});

		it("Z-TRM3 with commandClasses.add compat should work", async () => {
			const config = await configManager.lookupDevice(
				0x019b,
				0x0003,
				0x0203,
				"4.0",
			);
			expect(config).not.toBeUndefined();
			expect(config?.compat?.addCCs?.get(49)?.endpoints.size).toBe(3);
		});
	});
});
