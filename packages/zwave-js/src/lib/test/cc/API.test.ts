import { API, CCAPI } from "@zwave-js/cc";
import { NOT_KNOWN } from "@zwave-js/core";
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
		node2: ZWaveNode;
		controller: MockController;
	};
}

@API(0xff as any)
export class DummyCCAPI extends CCAPI {}

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

			const node2 = new ZWaveNode(2, driver);
			(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
				node2.id,
				node2,
			);
			context.node2 = node2;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

test.sequential(`supportsCommand() returns NOT_KNOWN by default`, ({ context, expect }) => {
	const { node2, driver } = context;
	const API = new DummyCCAPI(driver, node2);
	expect(API.supportsCommand(null as any)).toBe(NOT_KNOWN);
});
