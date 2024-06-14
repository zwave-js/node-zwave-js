// Load all CCs to populate the metadata
import "@zwave-js/cc";

import { CommandClasses, InterviewStage, NodeStatus } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

interface TestContext {
	driver: Driver;
	controller: MockController;
	makeNode: (canSleep?: boolean) => ZWaveNode;
}

const emptyNodeInfo = {
	supportedCCs: [],
	controlledCCs: [],
};

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

	t.context.makeNode = (canSleep: boolean = false): ZWaveNode => {
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
});

test.after.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

test.afterEach((t) => {
	const { driver } = t.context;
	driver.networkCache.clear();
});

test.serial("marks a sleeping node as awake", (t) => {
	const { makeNode } = t.context;

	const node = makeNode(true);
	node.markAsAsleep();

	node.updateNodeInfo(emptyNodeInfo as any);
	t.is(node.status, NodeStatus.Awake);
	node.destroy();
});

test.serial("does not throw when called on a non-sleeping node", (t) => {
	const { makeNode } = t.context;

	const node = makeNode(false);
	t.notThrows(() => node.updateNodeInfo(emptyNodeInfo as any));
	node.destroy();
});

test.serial("remembers all received CCs", (t) => {
	const { makeNode } = t.context;

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
	t.true(node.supportsCC(CommandClasses.Battery));
	t.true(node.supportsCC(CommandClasses.Configuration));
	node.destroy();
});

test.serial("ignores the data in an NIF if it was received already", (t) => {
	const { makeNode } = t.context;

	const node = makeNode();
	node.interviewStage = InterviewStage.Complete;
	node.updateNodeInfo({
		controlledCCs: [CommandClasses.Configuration],
		supportedCCs: [CommandClasses.Battery],
	} as any);

	t.false(node.supportsCC(CommandClasses.Battery));
	t.false(node.controlsCC(CommandClasses.Configuration));
	node.destroy();
});
