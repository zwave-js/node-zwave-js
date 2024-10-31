import { BasicCommand, SetValueStatus } from "@zwave-js/cc";
import { BasicCC, BasicCCValues } from "@zwave-js/cc/BasicCC";
import { CommandClasses, type ValueID, ValueMetadata } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import sinon from "sinon";
import { TaskContext, afterAll, beforeAll, test } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Utils.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { ZWaveNode } from "../../node/Node.js";
import { assertCC } from "../assertCC.js";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

// const test = ava as TestFn<TestContext>;

beforeAll(async (t) => {
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

afterAll(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

test.sequential("getValue() returns the values stored in the value DB", (t) => {
	const { driver } = t.context;

	const node = new ZWaveNode(1, driver);
	const valueId: ValueID = {
		commandClass: CommandClasses.Version,
		endpoint: 2,
		property: "3",
	};

	node.valueDB.setValue(valueId, 4);

	t.expect(node.getValue(valueId)).toBe(4);

	node.destroy();
});

test.sequential("setValue() issues the correct xyzCCSet command", async (t) => {
	const { driver } = t.context;

	// We test with a BasicCC
	const node = new ZWaveNode(1, driver);
	node.addCC(CommandClasses.Basic, { isSupported: true });

	// Since setValue also issues a get, we need to mock a response
	const sendMessage = sinon
		.stub()
		.onFirstCall()
		.resolves(undefined)
		// For some reason this is called twice?!
		.onSecondCall()
		.resolves({ command: {} });
	driver.sendMessage = sendMessage;

	const result = await node.setValue(
		{
			commandClass: CommandClasses.Basic,
			property: "targetValue",
		},
		5,
	);

	t.expect(result.status).toBe(SetValueStatus.SuccessUnsupervised);
	sinon.assert.called(sendMessage);

	assertCC(t, sendMessage.getCall(0).args[0], {
		cc: BasicCC,
		nodeId: node.id,
		ccValues: {
			ccCommand: BasicCommand.Set,
		},
	});
	node.destroy();
});

test.sequential(
	"setValue() returns false if the CC is not implemented",
	async (t) => {
		const { driver } = t.context;

		const node = new ZWaveNode(1, driver);
		const result = await node.setValue(
			{
				// @ts-expect-error
				commandClass: 0xbada55, // this is guaranteed to not be implemented
				property: "test",
			},
			1,
		);
		t.expect(result.status).toBe(SetValueStatus.NotImplemented);
		t.regex(result.message!, /Command Class 12245589 is not implemented/);
		node.destroy();
	},
);

{
	const valueDefinition = BasicCCValues.currentValue;
	const valueId = BasicCCValues.currentValue.id;

	function prepareTest(t: TaskContext & TestContext): ZWaveNode {
		const { driver } = t.context;
		const node = new ZWaveNode(1, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			node.id,
			node,
		);
		t.onTestFinished(() => node.destroy());
		return node;
	}

	test.sequential(
		"getValueMetadata() returns the defined metadata for the given value",
		(t) => {
			const node = prepareTest(t);
			// We test this with the BasicCC
			// currentValue is readonly, 0-99
			const currentValueMeta = node.getValueMetadata(valueId);
			t.expect(currentValueMeta).toMatchObject({
				readable: true,
				writeable: false,
				min: 0,
				max: 99,
				// Nothing special about this value, so we should get the default secret/stateful flags:
				secret: false,
				stateful: true,
			});
		},
	);

	test.sequential(
		"writing to the value DB with setValueMetadata() overwrites the statically defined metadata",
		(t) => {
			const node = prepareTest(t);
			// Create dynamic metadata
			node.valueDB.setMetadata(valueId, ValueMetadata.WriteOnlyInt32);

			const currentValueMeta = node.getValueMetadata(valueId);

			t.expect(currentValueMeta).toStrictEqual({
				...ValueMetadata.WriteOnlyInt32,
				secret: valueDefinition.options.secret,
				stateful: valueDefinition.options.stateful,
			});
		},
	);

	test.sequential(
		"writing to the value DB with setValueMetadata() preserves the secret/stateful flags",
		(t) => {
			const node = prepareTest(t);
			// Create dynamic metadata
			node.valueDB.setMetadata(valueId, {
				...ValueMetadata.WriteOnlyInt32,
				secret: !valueDefinition.options.secret,
				stateful: !valueDefinition.options.stateful,
			});

			const currentValueMeta = node.getValueMetadata(valueId);
			t.expect(currentValueMeta).toMatchObject({
				secret: valueDefinition.options.secret,
				stateful: valueDefinition.options.stateful,
			});
		},
	);
}
