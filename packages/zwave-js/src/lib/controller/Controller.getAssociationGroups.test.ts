import { AssociationCCValues } from "@zwave-js/cc/AssociationCC";
import { CommandClasses } from "@zwave-js/core";
import { test as baseTest } from "vitest";
import type { Driver } from "../driver/Driver.js";
import { ZWaveNode } from "../node/Node.js";
import { createEmptyMockDriver } from "../test/mocks.js";
import { ZWaveController } from "./Controller.js";

interface LocalTestContext {
	context: {
		fakeDriver: Driver;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup

			const fakeDriver = createEmptyMockDriver() as unknown as Driver;
			fakeDriver.registerRequestHandler = () => {};
			await fakeDriver.configManager.loadAll();

			// Run tests
			await use({ fakeDriver });

			// Teardown
		},
		{ auto: true },
	],
});

test("should respect the endpoint definition format when AGI is supported", async ({ context, expect }) => {
	const { fakeDriver } = context;

	const ctrl = new ZWaveController(fakeDriver);
	ctrl["_nodes"].set(1, new ZWaveNode(1, fakeDriver));
	(fakeDriver as any).controller = ctrl;
	const node1 = ctrl.nodes.getOrThrow(1);
	node1.addCC(CommandClasses.Association, {
		isSupported: true,
		version: 3,
	});
	node1.addCC(CommandClasses["Association Group Information"], {
		isSupported: true,
		version: 3,
	});
	node1.valueDB.setValue(AssociationCCValues.groupCount.id, 14);

	const deviceConfig = await fakeDriver.configManager.lookupDevice(
		// Logic Group ZDB5100
		0x0234,
		0x0003,
		0x0121,
		"0.0",
	);
	fakeDriver.getDeviceConfig = () => deviceConfig;

	expect(
		ctrl.getAssociationGroups({ nodeId: 1, endpoint: 0 }).get(4)?.label,
	).toBe("Button 1 (Multilevel Set)");
});

test("should respect the endpoint definition format when AGI is not supported", async ({ context, expect }) => {
	const { fakeDriver } = context;

	const ctrl = new ZWaveController(fakeDriver);
	ctrl["_nodes"].set(1, new ZWaveNode(1, fakeDriver));
	(fakeDriver as any).controller = ctrl;
	const node1 = ctrl.nodes.getOrThrow(1);
	node1.addCC(CommandClasses.Association, {
		isSupported: true,
		version: 3,
	});
	node1.valueDB.setValue(AssociationCCValues.groupCount.id, 14);

	const deviceConfig = await fakeDriver.configManager.lookupDevice(
		// Logic Group ZDB5100
		0x0234,
		0x0003,
		0x0121,
		"0.0",
	);
	fakeDriver.getDeviceConfig = () => deviceConfig;

	expect(
		ctrl.getAssociationGroups({ nodeId: 1, endpoint: 0 }).get(4)?.label,
	).toBe("Button 1 (Multilevel Set)");
});
