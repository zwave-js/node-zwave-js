import { CentralSceneKeys } from "@zwave-js/cc";
import { BasicCCSet } from "@zwave-js/cc/BasicCC";
import { CentralSceneCCNotification } from "@zwave-js/cc/CentralSceneCC";
import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import sinon from "sinon";
import { afterEach, beforeEach, test as baseTest } from "vitest";
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

beforeEach<LocalTestContext>(({ context, expect }) => {
	const { driver } = context;
	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node2.id,
		node2,
	);
	context.node2 = node2;
});

afterEach<LocalTestContext>(({ context, expect }) => {
	const { node2, driver } = context;
	node2.destroy();
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(
		node2.id,
	);
});

test(`persistValues() should not update "interviewComplete" in the value DB`, ({ context, expect }) => {
	const { node2, driver } = context;

	// Repro for #383
	const cc = new BasicCCSet({
		nodeId: node2.id,
		targetValue: 55,
	});
	cc.setInterviewComplete(driver, true);

	const mockSetValue = sinon.spy();
	node2.valueDB.setValue = mockSetValue;
	cc.persistValues(driver);

	const properties = mockSetValue
		.getCalls()
		.map((call) => call.args[0])
		.map(({ property }) => property);
	expect(properties.includes("interviewComplete")).toBe(false);
});

test(`persistValues() should not store values marked as "events" (non-stateful)`, async ({ context, expect }) => {
	const { node2, driver } = context;

	const cc = new CentralSceneCCNotification({
		nodeId: node2.id,
		sequenceNumber: 1,
		sceneNumber: 1,
		keyAttribute: CentralSceneKeys.KeyPressed,
	});

	// Central Scene should use the value notification event instead of added/updated
	const spyN = sinon.spy();
	const spyA = sinon.spy();
	node2.on("value notification", spyN);
	node2.on("value added", spyA);
	node2.on("value updated", spyA);
	await node2.handleCommand(cc);

	sinon.assert.notCalled(spyA);
	sinon.assert.called(spyN);
	expect(spyN.getCall(0).args[1].value).toBe(CentralSceneKeys.KeyPressed);

	// and not persist the value in the DB
	expect(node2.valueDB.getValues(CommandClasses["Central Scene"]).length)
		.toBe(0);
});
