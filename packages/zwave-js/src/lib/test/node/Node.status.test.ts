import { NodeStatus } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import ava, { type ExecutionContext, type TestFn } from "ava";
import sinon from "sinon";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";
import type { ZWaveNodeEvents } from "../../node/_Types";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
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

interface TestOptions {
	targetStatus: NodeStatus;
	expectedEvent: ZWaveNodeEvents;
}

function performTest(
	t: ExecutionContext<TestContext>,
	options: TestOptions,
): void {
	const node = new ZWaveNode(1, t.context.driver);
	node["_status"] = undefined as any;
	const spy = sinon.spy();
	node.on(options.expectedEvent, spy);
	node["onStatusChange"](options.targetStatus);
	node.destroy();
	sinon.assert.called(spy);
	t.pass();
}

test(
	"Changing the status to awake should raise the wake up event",
	performTest,
	{
		targetStatus: NodeStatus.Awake,
		expectedEvent: "wake up",
	},
);

test(
	"Changing the status to asleep should raise the sleep event",
	performTest,
	{
		targetStatus: NodeStatus.Asleep,
		expectedEvent: "sleep",
	},
);

test("Changing the status to dead should raise the dead event", performTest, {
	targetStatus: NodeStatus.Dead,
	expectedEvent: "dead",
});

test("Changing the status to alive should raise the alive event", performTest, {
	targetStatus: NodeStatus.Alive,
	expectedEvent: "alive",
});
