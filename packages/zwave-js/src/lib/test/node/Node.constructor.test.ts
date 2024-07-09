// Load all CCs to populate the metadata
import "@zwave-js/cc";

import { CommandClasses, ValueDB } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { DeviceClass } from "../../node/DeviceClass";
import { ZWaveNode } from "../../node/Node";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
	t.timeout(30000);

	const { driver } = await createAndStartTestingDriver({
		skipNodeInterview: true,
		loadConfiguration: false,
		beforeStartup(mockPort) {
			const controller = new MockController({ serial: mockPort });
			controller.defineBehavior(
				...createDefaultMockControllerBehaviors(),
			);
			t.context.controller = controller;
		},
	});
	t.context.driver = driver;
});

test.after.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

test.afterEach((t) => {
	const { driver } = t.context;
	driver.networkCache.clear();
});

test.serial("stores the given Node ID", (t) => {
	const { driver } = t.context;

	const node1 = new ZWaveNode(1, driver);
	t.is(node1.id, 1);
	const node3 = new ZWaveNode(3, driver);
	t.is(node3.id, 3);

	node1.destroy();
	node3.destroy();
});

test.serial("stores the given device class", (t) => {
	const { driver } = t.context;

	function makeNode(cls: DeviceClass): ZWaveNode {
		return new ZWaveNode(1, driver, cls);
	}

	const nodeUndef = makeNode(undefined as any);
	t.is(nodeUndef.deviceClass, undefined);

	const devCls = new DeviceClass(driver.configManager, 0x02, 0x01, 0x03);
	const nodeWithClass = makeNode(devCls);
	t.is(nodeWithClass.deviceClass, devCls);

	nodeUndef.destroy();
	nodeWithClass.destroy();
});

test.serial("remembers all given command classes", (t) => {
	const { driver } = t.context;

	function makeNode(
		supportedCCs: CommandClasses[] = [],
		controlledCCs: CommandClasses[] = [],
	): ZWaveNode {
		return new ZWaveNode(1, driver, undefined, supportedCCs, controlledCCs);
	}

	const tests: {
		supported: CommandClasses[];
		controlled: CommandClasses[];
	}[] = [
		{
			supported: [CommandClasses["Anti-Theft"]],
			controlled: [CommandClasses.Basic],
		},
	];
	for (const { supported, controlled } of tests) {
		const node = makeNode(supported, controlled);

		for (const supp of supported) {
			t.true(node.supportsCC(supp));
		}
		for (const ctrl of controlled) {
			t.true(node.controlsCC(ctrl));
		}

		node.destroy();
	}
});

test.serial("initializes the node's value DB", (t) => {
	const { driver } = t.context;

	const node = new ZWaveNode(1, driver);
	t.true(node.valueDB instanceof ValueDB);
	node.destroy();
});
