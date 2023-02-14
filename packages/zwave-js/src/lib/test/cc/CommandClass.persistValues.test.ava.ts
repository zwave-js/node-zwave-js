import { CentralSceneCommand, CentralSceneKeys } from "@zwave-js/cc";
import { BasicCCSet } from "@zwave-js/cc/BasicCC";
import { CentralSceneCCNotification } from "@zwave-js/cc/CentralSceneCC";
import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { TestFn } from "ava";
import sinon from "sinon";
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

	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node2.id,
		node2,
	);
	t.context.node2 = node2;
});

test.after.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test.beforeEach((t) => {
	const { driver } = t.context;
	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node2.id,
		node2,
	);
	t.context.node2 = node2;
});

test.afterEach((t) => {
	const { node2, driver } = t.context;
	node2.destroy();
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(
		node2.id,
	);
});

test(`persistValues() should not update "interviewComplete" in the value DB`, (t) => {
	const { node2, driver } = t.context;

	// Repro for #383
	const cc = new BasicCCSet(driver, {
		nodeId: node2.id,
		targetValue: 55,
	});
	cc.setInterviewComplete(driver, true);

	const mockSetValue = sinon.spy();
	node2.valueDB.setValue = mockSetValue;
	cc.persistValues(driver);

	const properties = mockSetValue
		.getCalls()
		.map((call) => call.args[0])
		.map(({ property }) => property);
	t.false(properties.includes("interviewComplete"));
});

test(`persistValues() should not store values marked as "events" (non-stateful)`, async (t) => {
	const { node2, driver } = t.context;

	const cc = new CentralSceneCCNotification(driver, {
		nodeId: node2.id,
		data: Buffer.from([
			CommandClasses["Central Scene"],
			CentralSceneCommand.Notification,
			1, // seq number
			CentralSceneKeys.KeyPressed,
			1, // scene number
		]),
	});

	// Central Scene should use the value notification event instead of added/updated
	const spyN = sinon.spy();
	const spyA = sinon.spy();
	node2.on("value notification", spyN);
	node2.on("value added", spyA);
	node2.on("value updated", spyA);
	await node2.handleCommand(cc);

	sinon.assert.notCalled(spyA);
	sinon.assert.called(spyN);
	t.is(spyN.getCall(0).args[1].value, CentralSceneKeys.KeyPressed);

	// and not persist the value in the DB
	t.is(node2.valueDB.getValues(CommandClasses["Central Scene"]).length, 0);
});
