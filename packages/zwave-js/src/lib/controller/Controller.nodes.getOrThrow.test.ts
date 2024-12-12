import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../Testing.js";
import type { Driver } from "../driver/Driver.js";
import { createAndStartTestingDriver } from "../driver/DriverMock.js";
import { ZWaveNode } from "../node/Node.js";

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
				loadConfiguration: false,
				skipNodeInterview: true,
				beforeStartup(mockPort, serial) {
					context.controller = new MockController({
						mockPort,
						serial,
					});
					context.controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
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

test("should return a node if it was found", ({ context, expect }) => {
	const { driver } = context;
	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node2.id,
		node2,
	);
	expect(() => driver.controller.nodes.getOrThrow(2)).not.toThrow();
});

test("should throw if the node was not found", ({ context, expect }) => {
	const { driver } = context;
	assertZWaveError(expect, () => driver.controller.nodes.getOrThrow(3), {
		errorCode: ZWaveErrorCodes.Controller_NodeNotFound,
	});
});
