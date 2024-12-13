// Load all CCs to populate the metadata
import "@zwave-js/cc";

import { CommandClasses, ValueDB } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import { afterEach, test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { DeviceClass } from "../../node/DeviceClass.js";
import { ZWaveNode } from "../../node/Node.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver } = await createAndStartTestingDriver({
				skipNodeInterview: true,
				loadConfiguration: false,
				beforeStartup(mockPort, serial) {
					const controller = new MockController({
						mockPort,
						serial,
					});
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
					context.controller = controller;
				},
			});
			context.driver = driver;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

afterEach<LocalTestContext>(({ context, expect }) => {
	const { driver } = context;
	driver.networkCache.clear();
});

test.sequential("stores the given Node ID", ({ context, expect }) => {
	const { driver } = context;

	const node1 = new ZWaveNode(1, driver);
	expect(node1.id).toBe(1);
	const node3 = new ZWaveNode(3, driver);
	expect(node3.id).toBe(3);

	node1.destroy();
	node3.destroy();
});

test.sequential("stores the given device class", ({ context, expect }) => {
	const { driver } = context;

	function makeNode(cls: DeviceClass): ZWaveNode {
		return new ZWaveNode(1, driver, cls);
	}

	const nodeUndef = makeNode(undefined as any);
	expect(nodeUndef.deviceClass).toBeUndefined();

	const devCls = new DeviceClass(0x02, 0x01, 0x03);
	const nodeWithClass = makeNode(devCls);
	expect(nodeWithClass.deviceClass).toBe(devCls);
	expect(nodeWithClass.deviceClass?.specific.key).toBe(0x03);

	nodeUndef.destroy();
	nodeWithClass.destroy();
});

test.sequential("remembers all given command classes", ({ context, expect }) => {
	const { driver } = context;

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
			expect(node.supportsCC(supp)).toBe(true);
		}
		for (const ctrl of controlled) {
			expect(node.controlsCC(ctrl)).toBe(true);
		}

		node.destroy();
	}
});

test.sequential("initializes the node's value DB", ({ context, expect }) => {
	const { driver } = context;

	const node = new ZWaveNode(1, driver);
	expect(node.valueDB instanceof ValueDB).toBe(true);
	node.destroy();
});
