import { BasicCC } from "@zwave-js/cc/BasicCC";
import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
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

test("should throw if the CC is not supported", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	assertZWaveError(t, () => node.createCCInstance(CommandClasses.Basic), {
		errorCode: ZWaveErrorCodes.CC_NotSupported,
		messageMatches: "unsupported",
	});
	node.destroy();
});

test("should return a linked instance of the correct CC", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node.id,
		node,
	);
	node.addCC(CommandClasses.Basic, { isSupported: true });

	const cc = node.createCCInstance(BasicCC)!;
	t.true(cc instanceof BasicCC);
	t.is(cc.getNode(driver), node);
	node.destroy();
});
