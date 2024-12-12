import { CommandClasses, type ValueID } from "@zwave-js/core";
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
		controller: MockController;
		node: ZWaveNode;
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

const onValueAdded = sinon.spy();
const onValueUpdated = sinon.spy();
const onValueRemoved = sinon.spy();

beforeEach<LocalTestContext>(({ context, expect }) => {
	const { driver } = context;
	const node = new ZWaveNode(1, driver)
		.on("value added", onValueAdded)
		.on("value updated", onValueUpdated)
		.on("value removed", onValueRemoved);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node.id,
		node,
	);
	context.node = node;

	onValueAdded.resetHistory();
	onValueUpdated.resetHistory();
	onValueRemoved.resetHistory();
});

afterEach<LocalTestContext>(({ context, expect }) => {
	const { node, driver } = context;
	node.destroy();
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(node.id);
});

test.sequential(
	"the emitted events should contain a speaking name for the CC",
	({ context, expect }) => {
		const { node } = context;

		const cc = CommandClasses["Wake Up"];
		const ccName = CommandClasses[cc];
		const valueId: ValueID = {
			commandClass: cc,
			property: "fooProp",
		};
		node.valueDB.setValue(valueId, 1);
		sinon.assert.called(onValueAdded);
		node.valueDB.setValue(valueId, 3);
		sinon.assert.called(onValueUpdated);
		node.valueDB.removeValue(valueId);
		sinon.assert.called(onValueRemoved);

		for (const method of [onValueAdded, onValueUpdated, onValueRemoved]) {
			const cbArg = method.getCall(0).args[1];
			expect(cbArg.commandClassName).toBe(ccName);
		}
	},
);

test.sequential(
	"the emitted events should contain a speaking name for the propertyKey",
	({ context, expect }) => {
		const { node } = context;
		node.valueDB.setValue(
			{
				commandClass: CommandClasses["Thermostat Setpoint"],
				property: "setpoint",
				propertyKey: 1, /* Heating */
			},
			5,
		);
		sinon.assert.called(onValueAdded);
		const cbArg = onValueAdded.getCall(0).args[1];
		expect(cbArg.propertyKeyName).toBe("Heating");
	},
);

test.sequential(
	"the emitted events should not be emitted for internal values",
	({ context, expect }) => {
		const { node } = context;
		node.valueDB.setValue(
			{
				commandClass: CommandClasses.Battery,
				property: "interviewComplete", // interviewCompleted is an internal value
			},
			true,
		);
		sinon.assert.notCalled(onValueAdded);
	},
);
