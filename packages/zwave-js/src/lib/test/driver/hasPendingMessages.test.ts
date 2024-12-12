import { CommandClasses, type ValueID } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import { test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		node2: ZWaveNode;
		controller: MockController;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
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
			const node2 = new ZWaveNode(2, driver);
			context.node2 = node2;
			(driver.controller.nodes as any as Map<any, any>).set(
				node2.id,
				node2,
			);
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

test("should return true when there is a poll scheduled for a node", ({ context, expect }) => {
	const { driver, node2 } = context;
	expect(driver["hasPendingMessages"](node2)).toBe(false);
	const valueId: ValueID = {
		commandClass: CommandClasses.Basic,
		property: "currentValue",
	};
	node2.schedulePoll(valueId, { timeoutMs: 1000 });
	expect(driver["hasPendingMessages"](node2)).toBe(true);
	node2.cancelScheduledPoll(valueId);
	expect(driver["hasPendingMessages"](node2)).toBe(false);
});
