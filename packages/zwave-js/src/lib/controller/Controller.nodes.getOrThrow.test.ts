import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../Utils";
import type { Driver } from "../driver/Driver";
import { createAndStartTestingDriver } from "../driver/DriverMock";
import { ZWaveNode } from "../node/Node";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
	t.timeout(30000);
	const { driver } = await createAndStartTestingDriver({
		loadConfiguration: false,
		skipNodeInterview: true,
		beforeStartup(mockPort) {
			t.context.controller = new MockController({ serial: mockPort });
			t.context.controller.defineBehavior(
				...createDefaultMockControllerBehaviors(),
			);
		},
	});
	t.context.driver = driver;
});

test.after.always(async (t) => {
	await t.context.driver.destroy();
});

test("should return a node if it was found", (t) => {
	const { driver } = t.context;
	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node2.id,
		node2,
	);
	t.notThrows(() => driver.controller.nodes.getOrThrow(2));
});

test("should throw if the node was not found", (t) => {
	const { driver } = t.context;
	assertZWaveError(t, () => driver.controller.nodes.getOrThrow(3), {
		errorCode: ZWaveErrorCodes.Controller_NodeNotFound,
	});
});
