import { loadDeviceIndex, lookupDevice } from "./Devices";

describe("lib/config/Devices", () => {
	describe("lookupDevice (regression tests)", () => {
		beforeAll(async () => {
			await loadDeviceIndex();
		});

		it("Z-TRM3 with commandClasses.add compat should work", async () => {
			const config = await lookupDevice(0x019b, 0x0003, 0x0203, "4.0");
			expect(config).not.toBeUndefined();
			expect(config?.compat?.addCCs?.get(49)?.endpoints.size).toBe(3);
		});
	});
});
