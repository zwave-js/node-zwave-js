import { API, CCAPI } from "@zwave-js/cc";
import { NOT_KNOWN } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { beforeAll, test } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Utils.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";

interface TestContext {
	driver: Driver;
	node2: ZWaveNode;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

@API(0xff as any)
export class DummyCCAPI extends CCAPI {}

beforeAll(async (t) => {
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

afterAll(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test.sequential(`supportsCommand() returns NOT_KNOWN by default`, (t) => {
	const { node2, driver } = t.context;
	const API = new DummyCCAPI(driver, node2);
	t.expect(API.supportsCommand(null as any)).toBe(NOT_KNOWN);
});
