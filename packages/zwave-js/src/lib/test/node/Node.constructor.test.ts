// Load all CCs to populate the metadata
import "@zwave-js/cc";

import { CommandClasses, ValueDB } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import { afterEach, beforeAll, test } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Utils.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { DeviceClass } from "../../node/DeviceClass.js";
import { ZWaveNode } from "../../node/Node.js";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

beforeAll(async (t) => {
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

afterAll(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

afterEach((t) => {
	const { driver } = t.context;
	driver.networkCache.clear();
});

test.sequential("stores the given Node ID", (t) => {
	const { driver } = t.context;

	const node1 = new ZWaveNode(1, driver);
	t.expect(node1.id).toBe(1);
	const node3 = new ZWaveNode(3, driver);
	t.expect(node3.id).toBe(3);

	node1.destroy();
	node3.destroy();
});

test.sequential("stores the given device class", (t) => {
	const { driver } = t.context;

	function makeNode(cls: DeviceClass): ZWaveNode {
		return new ZWaveNode(1, driver, cls);
	}

	const nodeUndef = makeNode(undefined as any);
	t.expect(nodeUndef.deviceClass).toBeUndefined();

	const devCls = new DeviceClass(0x02, 0x01, 0x03);
	const nodeWithClass = makeNode(devCls);
	t.expect(nodeWithClass.deviceClass).toBe(devCls);
	t.expect(nodeWithClass.deviceClass?.specific.key).toBe(0x03);

	nodeUndef.destroy();
	nodeWithClass.destroy();
});

test.sequential("remembers all given command classes", (t) => {
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
			t.expect(node.supportsCC(supp)).toBe(true);
		}
		for (const ctrl of controlled) {
			t.expect(node.controlsCC(ctrl)).toBe(true);
		}

		node.destroy();
	}
});

test.sequential("initializes the node's value DB", (t) => {
	const { driver } = t.context;

	const node = new ZWaveNode(1, driver);
	t.expect(node.valueDB instanceof ValueDB).toBe(true);
	node.destroy();
});
