// Load all CCs to populate the metadata
import "@zwave-js/cc";

import { CommandClasses, InterviewStage, NodeStatus } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { afterEach, test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
		makeNode: (canSleep?: boolean) => ZWaveNode;
	};
}

const emptyNodeInfo = {
	supportedCCs: [],
	controlledCCs: [],
};

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

			context.makeNode = (canSleep: boolean = false): ZWaveNode => {
				const node = new ZWaveNode(2, driver);
				node["isListening"] = !canSleep;
				node["isFrequentListening"] = false;
				// If the node doesn't support Z-Wave+ Info CC, the node instance
				// will try to poll the device for changes. We don't want this to happen in tests.
				node.addCC(CommandClasses["Z-Wave Plus Info"], {
					isSupported: true,
				});
				// node.addCC(CommandClasses["Wake Up"], { isSupported: true });
				(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
					node.id,
					node,
				);
				return node;
			};

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

test.sequential("marks a sleeping node as awake", ({ context, expect }) => {
	const { makeNode } = context;

	const node = makeNode(true);
	node.markAsAsleep();

	node.updateNodeInfo(emptyNodeInfo as any);
	expect(node.status).toBe(NodeStatus.Awake);
	node.destroy();
});

test.sequential("does not throw when called on a non-sleeping node", ({ context, expect }) => {
	const { makeNode } = context;

	const node = makeNode(false);
	expect(() => node.updateNodeInfo(emptyNodeInfo as any)).not.toThrow();
	node.destroy();
});

test.sequential("remembers all received CCs", ({ context, expect }) => {
	const { makeNode } = context;

	const node = makeNode();
	node.addCC(CommandClasses.Battery, {
		isControlled: true,
	});
	node.addCC(CommandClasses.Configuration, {
		isControlled: true,
	});

	node.updateNodeInfo({
		supportedCCs: [CommandClasses.Battery, CommandClasses.Configuration],
	} as any);
	expect(node.supportsCC(CommandClasses.Battery)).toBe(true);
	expect(node.supportsCC(CommandClasses.Configuration)).toBe(true);
	node.destroy();
});

test.sequential("ignores the data in an NIF if it was received already", ({ context, expect }) => {
	const { makeNode } = context;

	const node = makeNode();
	node.interviewStage = InterviewStage.Complete;
	node.updateNodeInfo({
		controlledCCs: [CommandClasses.Configuration],
		supportedCCs: [CommandClasses.Battery],
	} as any);

	expect(node.supportsCC(CommandClasses.Battery)).toBe(false);
	expect(node.controlsCC(CommandClasses.Configuration)).toBe(false);
	node.destroy();
});
