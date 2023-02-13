import { CommandClasses } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../Utils";
import type { Driver } from "../driver/Driver";
import { createAndStartTestingDriver } from "../driver/DriverMock";
import { ZWaveNode } from "./Node";

interface TestContext {
	driver: Driver;
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
});

test.after.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

test("getCCVersion() should return 0 if a command class is not supported", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	t.is(node.getCCVersion(CommandClasses["Anti-Theft"]), 0);
	node.destroy();
});

test("getCCVersion() should return the supported version otherwise", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	node.addCC(CommandClasses["Anti-Theft"], {
		isSupported: true,
		version: 5,
	});
	t.is(node.getCCVersion(CommandClasses["Anti-Theft"]), 5);
	node.destroy();
});

test("removeCC() should mark a CC as not supported", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	node.addCC(CommandClasses["Anti-Theft"], {
		isSupported: true,
		version: 7,
	});
	t.is(node.getCCVersion(CommandClasses["Anti-Theft"]), 7);

	node.removeCC(CommandClasses["Anti-Theft"]);
	t.is(node.getCCVersion(CommandClasses["Anti-Theft"]), 0);
	node.destroy();
});
