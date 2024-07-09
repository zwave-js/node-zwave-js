import { CommandClasses, type ValueID } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

interface TestContext {
	driver: Driver;
	node2: ZWaveNode;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	t.timeout(30000);
	const { driver } = await createAndStartTestingDriver({
		loadConfiguration: false,
		skipNodeInterview: true,
		beforeStartup(mockPort) {
			const controller = new MockController({ serial: mockPort });
			controller.defineBehavior(
				...createDefaultMockControllerBehaviors(),
			);
			t.context.controller = controller;
		},
	});
	const node2 = new ZWaveNode(2, driver);
	t.context.node2 = node2;
	(driver.controller.nodes as any as Map<any, any>).set(node2.id, node2);
	t.context.driver = driver;
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test("should return true when there is a poll scheduled for a node", (t) => {
	const { driver, node2 } = t.context;
	t.false(driver["hasPendingMessages"](node2));
	const valueId: ValueID = {
		commandClass: CommandClasses.Basic,
		property: "currentValue",
	};
	node2.schedulePoll(valueId, { timeoutMs: 1000 });
	t.true(driver["hasPendingMessages"](node2));
	node2.cancelScheduledPoll(valueId);
	t.false(driver["hasPendingMessages"](node2));
});
