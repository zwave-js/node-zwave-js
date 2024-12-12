import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
		makeNode: (canSleep?: boolean) => ZWaveNode;
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

			context.makeNode = (canSleep: boolean = false): ZWaveNode => {
				const node = new ZWaveNode(2, driver);
				node["isListening"] = !canSleep;
				node["isFrequentListening"] = false;
				if (canSleep) {
					node.addCC(CommandClasses["Wake Up"], {
						isSupported: true,
					});
				}
				(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
					node.id,
					node,
				);
				return node;
			};

			// Run tests
			await use(context);

			// Teardown
			await driver.destroy();
		},
		{ auto: true },
	],
});

test("resolves when a sleeping node wakes up", async ({ context, expect }) => {
	const { makeNode } = context;
	const node = makeNode(true);
	node.markAsAsleep();

	const promise = node.waitForWakeup();
	await wait(1);
	node.markAsAwake();
	await promise;

	node.destroy();
});

test("resolves immediately when called on an awake node", async ({ context, expect }) => {
	const { makeNode } = context;
	const node = makeNode(true);
	node.markAsAwake();

	await node.waitForWakeup();
	node.destroy();
});

test("throws when called on a non-sleeping node", async ({ context, expect }) => {
	const { makeNode } = context;
	const node = makeNode(false);

	await assertZWaveError(expect, () => node.waitForWakeup(), {
		errorCode: ZWaveErrorCodes.CC_NotSupported,
	});

	node.destroy();
});
