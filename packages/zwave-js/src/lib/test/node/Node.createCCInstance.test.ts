import { BasicCC } from "@zwave-js/cc/BasicCC";
import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
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

test("should throw if the CC is not supported", ({ context, expect }) => {
	const { driver } = context;
	const node = new ZWaveNode(2, driver);
	assertZWaveError(
		expect,
		() => node.createCCInstance(CommandClasses.Basic),
		{
			errorCode: ZWaveErrorCodes.CC_NotSupported,
			messageMatches: "unsupported",
		},
	);
	node.destroy();
});

test("should return a linked instance of the correct CC", ({ context, expect }) => {
	const { driver } = context;
	const node = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node.id,
		node,
	);
	node.addCC(CommandClasses.Basic, { isSupported: true });

	const cc = node.createCCInstance(BasicCC)!;
	expect(cc instanceof BasicCC).toBe(true);
	expect(cc.getNode(driver)).toBe(node);
	node.destroy();
});
