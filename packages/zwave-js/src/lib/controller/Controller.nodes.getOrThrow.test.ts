import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { beforeAll, test } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../Utils.js";
import type { Driver } from "../driver/Driver.js";
import { createAndStartTestingDriver } from "../driver/DriverMock.js";
import { ZWaveNode } from "../node/Node.js";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

beforeAll(async (t) => {
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

afterAll(async (t) => {
	await t.context.driver.destroy();
});

test("should return a node if it was found", (t) => {
	const { driver } = t.context;
	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node2.id,
		node2,
	);
	t.expect(() => driver.controller.nodes.getOrThrow(2)).not.toThrow();
});

test("should throw if the node was not found", (t) => {
	const { driver } = t.context;
	assertZWaveError(t.expect, () => driver.controller.nodes.getOrThrow(3), {
		errorCode: ZWaveErrorCodes.Controller_NodeNotFound,
	});
});
