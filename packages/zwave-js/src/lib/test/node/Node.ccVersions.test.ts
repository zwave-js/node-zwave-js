import { CommandClasses } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import { test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver } = await createAndStartTestingDriver({
				skipNodeInterview: true,
				loadConfiguration: false,
				beforeStartup(mockPort, serial) {
					const controller = new MockController({
						mockPort,
						serial,
					});
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
					context.controller = controller;
				},
			});
			context.driver = driver;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

test("getCCVersion() should return 0 if a command class is not supported", ({ context, expect }) => {
	const { driver } = context;
	const node = new ZWaveNode(2, driver);
	expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(0);
	node.destroy();
});

test("getCCVersion() should return the supported version otherwise", ({ context, expect }) => {
	const { driver } = context;
	const node = new ZWaveNode(2, driver);
	node.addCC(CommandClasses["Anti-Theft"], {
		isSupported: true,
		version: 5,
	});
	expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(5);
	node.destroy();
});

test("removeCC() should mark a CC as not supported", ({ context, expect }) => {
	const { driver } = context;
	const node = new ZWaveNode(2, driver);
	node.addCC(CommandClasses["Anti-Theft"], {
		isSupported: true,
		version: 7,
	});
	expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(7);

	node.removeCC(CommandClasses["Anti-Theft"]);
	expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(0);
	node.destroy();
});
