import { ConfigManager } from "./ConfigManager";

describe("lib/config/Devices", () => {
	describe("lookupDevice (regression tests)", () => {
		it("Z-TRM3 with commandClasses.add compat should work", async () => {
			// This test might take a while
			jest.setTimeout(60000);

			const configManager = new ConfigManager();
			const config = await configManager.lookupDevice(
				0x019b,
				0x0003,
				0x0203,
				"4.0",
			);
			expect(config).not.toBeUndefined();
			expect(config?.compat?.addCCs?.get(49)?.endpoints.size).toBe(3);
		});

		it("Associations on endpoints should work - including imports", async () => {
			// Logic Group ZDB5100

			// This test might take a while
			jest.setTimeout(60000);

			const configManager = new ConfigManager();
			const config = await configManager.lookupDevice(
				0x0234,
				0x0003,
				0x0121,
				"0.0",
			);
			expect(config).not.toBeUndefined();
			expect(
				config?.endpoints?.get(1)?.associations?.get(1),
			).toMatchObject({
				label: "Lifeline",
				maxNodes: 5,
				isLifeline: false,
			});
			expect(
				config?.endpoints?.get(4)?.associations?.get(3),
			).toMatchObject({
				label: "Button 4 (Binary Switch Set)",
				maxNodes: 5,
			});
		});
	});
});
