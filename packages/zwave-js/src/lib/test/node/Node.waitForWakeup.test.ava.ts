import {
	assertZWaveErrorAva,
	CommandClasses,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
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
		if (canSleep)
			node.addCC(CommandClasses["Wake Up"], { isSupported: true });
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

test("resolves when a sleeping node wakes up", async (t) => {
	const { makeNode } = t.context;
	const node = makeNode(true);
	node.markAsAsleep();

	const promise = node.waitForWakeup();
	await wait(1);
	node.markAsAwake();
	await t.notThrowsAsync(() => promise);

	node.destroy();
});

test("resolves immediately when called on an awake node", async (t) => {
	const { makeNode } = t.context;
	const node = makeNode(true);
	node.markAsAwake();

	await t.notThrowsAsync(() => node.waitForWakeup());
	node.destroy();
});

test("throws when called on a non-sleeping node", async (t) => {
	const { makeNode } = t.context;
	const node = makeNode(false);

	await assertZWaveErrorAva(t, () => node.waitForWakeup(), {
		errorCode: ZWaveErrorCodes.CC_NotSupported,
	});

	t.pass();

	node.destroy();
});
