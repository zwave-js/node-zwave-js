import { BasicCCValues } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { TestFn } from "ava";
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
	node2.addCC(CommandClasses.Basic, {
		isSupported: true,
		version: 1,
	});
	t.context.node2 = node2;
});

test.after.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test.serial("should NOT include the compat event value", (t) => {
	const { node2 } = t.context;
	const valueIDs = node2.getDefinedValueIDs();
	t.false(
		valueIDs
			.map(({ property }) => property)
			.includes(BasicCCValues.compatEvent.id.property),
	);
});

test.serial("except when the corresponding compat flag is set", (t) => {
	const { node2 } = t.context;
	// @ts-expect-error
	node2["_deviceConfig"] = {
		compat: {
			treatBasicSetAsEvent: true,
		},
	};

	const valueIDs = node2.getDefinedValueIDs();
	t.true(
		valueIDs
			.map(({ property }) => property)
			.includes(BasicCCValues.compatEvent.id.property),
	);
});
