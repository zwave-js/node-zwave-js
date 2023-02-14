import { AssociationCCValues } from "@zwave-js/cc/AssociationCC";
import { CommandClasses } from "@zwave-js/core";
import ava, { type TestFn } from "ava";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import { ZWaveController } from "./Controller";

interface TestContext {
	fakeDriver: Driver;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
	t.timeout(60000);

	const fakeDriver = createEmptyMockDriver() as unknown as Driver;
	fakeDriver.registerRequestHandler = () => {};
	await fakeDriver.configManager.loadAll();

	t.context.fakeDriver = fakeDriver;
});

test("should respect the endpoint definition format when AGI is supported", async (t) => {
	const { fakeDriver } = t.context;

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

	t.is(
		ctrl.getAssociationGroups({ nodeId: 1, endpoint: 0 }).get(4)?.label,
		"Button 1 (Multilevel Set)",
	);
});

test("should respect the endpoint definition format when AGI is not supported", async (t) => {
	const { fakeDriver } = t.context;

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

	t.is(
		ctrl.getAssociationGroups({ nodeId: 1, endpoint: 0 }).get(4)?.label,
		"Button 1 (Multilevel Set)",
	);
});
