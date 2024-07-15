import { API, CCAPI } from "@zwave-js/cc";
import { NOT_KNOWN } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
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

@API(0xff as any)
export class DummyCCAPI extends CCAPI {}

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

test.serial(`supportsCommand() returns NOT_KNOWN by default`, (t) => {
	const { node2, driver } = t.context;
	const API = new DummyCCAPI(driver, node2);
	t.is(API.supportsCommand(null as any), NOT_KNOWN);
});
