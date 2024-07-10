import { CommandClasses, type ValueID } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import sinon from "sinon";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

interface TestContext {
	driver: Driver;
	controller: MockController;
	node: ZWaveNode;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
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

test.after.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

const onValueAdded = sinon.spy();
const onValueUpdated = sinon.spy();
const onValueRemoved = sinon.spy();

test.beforeEach((t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(1, driver)
		.on("value added", onValueAdded)
		.on("value updated", onValueUpdated)
		.on("value removed", onValueRemoved);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node.id,
		node,
	);
	t.context.node = node;

	onValueAdded.resetHistory();
	onValueUpdated.resetHistory();
	onValueRemoved.resetHistory();
});

test.afterEach((t) => {
	const { node, driver } = t.context;
	node.destroy();
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(node.id);
});

test.serial(
	"the emitted events should contain a speaking name for the CC",
	(t) => {
		const { node } = t.context;

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
			t.is(cbArg.commandClassName, ccName);
		}
	},
);

test.serial(
	"the emitted events should contain a speaking name for the propertyKey",
	(t) => {
		const { node } = t.context;
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
		t.is(cbArg.propertyKeyName, "Heating");
	},
);

test.serial(
	"the emitted events should not be emitted for internal values",
	(t) => {
		const { node } = t.context;
		node.valueDB.setValue(
			{
				commandClass: CommandClasses.Battery,
				property: "interviewComplete", // interviewCompleted is an internal value
			},
			true,
		);
		sinon.assert.notCalled(onValueAdded);
		t.pass();
	},
);
