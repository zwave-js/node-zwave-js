import { NodeStatus } from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import sinon from "sinon";
import { test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";
import type { ZWaveNodeEvents } from "../../node/_Types.js";

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

interface TestOptions {
	targetStatus: NodeStatus;
	expectedEvent: ZWaveNodeEvents;
}

function performTest(
	context: LocalTestContext["context"],
	options: TestOptions,
): void {
	const node = new ZWaveNode(1, context.driver);
	node["_status"] = undefined as any;
	const spy = sinon.spy();
	node.on(options.expectedEvent, spy);
	node["onStatusChange"](options.targetStatus);
	node.destroy();
	sinon.assert.called(spy);
}

test(
	"Changing the status to awake should raise the wake up event",
	({ context }) =>
		performTest(context, {
			targetStatus: NodeStatus.Awake,
			expectedEvent: "wake up",
		}),
);

test(
	"Changing the status to asleep should raise the sleep event",
	({ context }) =>
		performTest(context, {
			targetStatus: NodeStatus.Asleep,
			expectedEvent: "sleep",
		}),
);

test(
	"Changing the status to dead should raise the dead event",
	({ context }) =>
		performTest(context, {
			targetStatus: NodeStatus.Dead,
			expectedEvent: "dead",
		}),
);

test(
	"Changing the status to alive should raise the alive event",
	({ context }) =>
		performTest(context, {
			targetStatus: NodeStatus.Alive,
			expectedEvent: "alive",
		}),
);
