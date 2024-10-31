import { CommandClasses } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import { beforeAll, test } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Utils.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

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
});

afterAll(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

test("getCCVersion() should return 0 if a command class is not supported", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	t.expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(0);
	node.destroy();
});

test("getCCVersion() should return the supported version otherwise", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	node.addCC(CommandClasses["Anti-Theft"], {
		isSupported: true,
		version: 5,
	});
	t.expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(5);
	node.destroy();
});

test("removeCC() should mark a CC as not supported", (t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(2, driver);
	node.addCC(CommandClasses["Anti-Theft"], {
		isSupported: true,
		version: 7,
	});
	t.expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(7);

	node.removeCC(CommandClasses["Anti-Theft"]);
	t.expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(0);
	node.destroy();
});
