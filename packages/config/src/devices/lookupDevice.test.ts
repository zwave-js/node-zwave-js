import test from "ava";
import { ConfigManager } from "../ConfigManager";

test("Z-TRM3 with commandClasses.add compat should work", async (t) => {
	// This test might take a while
	t.timeout(60000);

	const configManager = new ConfigManager();
	const config = await configManager.lookupDevice(
		0x019b,
		0x0003,
		0x0203,
		"4.0",
	);
	t.not(config, undefined);
	t.is(config?.compat?.addCCs?.get(49)?.endpoints.size, 3);
});

test("Associations on endpoints should work - including imports", async (t) => {
	// This test might take a while
	t.timeout(60000);
	// Logic Group ZDB5100

	const configManager = new ConfigManager();
	const config = await configManager.lookupDevice(
		0x0234,
		0x0003,
		0x0121,
		"0.0",
	);
	t.not(config, undefined);
	t.like(config?.endpoints?.get(0)?.associations?.get(2), {
		label: "Button 1 (Basic Report)",
		maxNodes: 5,
	});
	t.like(config?.endpoints?.get(1)?.associations?.get(1), {
		label: "Lifeline",
		maxNodes: 5,
		isLifeline: false,
	});
	t.like(config?.endpoints?.get(4)?.associations?.get(3), {
		label: "Button 4 (Binary Switch Set)",
		maxNodes: 5,
	});
});
