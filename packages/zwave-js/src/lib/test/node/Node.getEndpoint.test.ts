import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { type TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { DeviceClass } from "../../node/DeviceClass";
import { ZWaveNode } from "../../node/Node";

interface TestContext {
	driver: Driver;
	controller: MockController;
	node: ZWaveNode;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
	t.timeout(30000);

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

test.beforeEach((t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(
		2,
		driver,
		new DeviceClass(driver.configManager, 0x04, 0x01, 0x01), // Portable Remote Controller
	);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node.id,
		node,
	);
	t.context.node = node;
});

test.afterEach((t) => {
	const { driver, node } = t.context;

	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(node.id);
	node.valueDB.clear();
	node.destroy();
	driver.networkCache.clear();
});

test.serial("throws when a negative endpoint index is requested", (t) => {
	const { node } = t.context;
	assertZWaveError(t, () => node.getEndpoint(-1), {
		errorCode: ZWaveErrorCodes.Argument_Invalid,
		messageMatches: "must be positive",
	});
});

test.serial("returns the node itself when endpoint 0 is requested", (t) => {
	const { node } = t.context;
	t.is(node.getEndpoint(0), node);
});

test.serial(
	"returns a new endpoint with the correct endpoint index otherwise",
	(t) => {
		const { node } = t.context;

		// interviewComplete needs to be true for getEndpoint to work
		node.valueDB.setValue(
			{
				commandClass: CommandClasses["Multi Channel"],
				property: "interviewComplete",
			},
			true,
		);
		node.valueDB.setValue(
			{
				commandClass: CommandClasses["Multi Channel"],
				property: "individualCount",
			},
			5,
		);
		const actual = node.getEndpoint(5)!;
		t.is(actual.index, 5);
		t.is(actual.nodeId, 2);
	},
);

test.serial("caches the created endpoint instances", (t) => {
	const { node } = t.context;

	// interviewComplete needs to be true for getEndpoint to work
	node.valueDB.setValue(
		{
			commandClass: CommandClasses["Multi Channel"],
			property: "interviewComplete",
		},
		true,
	);
	node.valueDB.setValue(
		{
			commandClass: CommandClasses["Multi Channel"],
			property: "individualCount",
		},
		5,
	);
	const first = node.getEndpoint(5);
	const second = node.getEndpoint(5);
	t.not(first, undefined);
	t.is(first, second);
});

test.serial(
	"returns undefined if a non-existent endpoint is requested",
	(t) => {
		const { node } = t.context;
		const actual = node.getEndpoint(5);
		t.is(actual, undefined);
	},
);

test.serial("sets the correct device class for the endpoint", async (t) => {
	const { node } = t.context;

	// interviewComplete needs to be true for getEndpoint to work
	node.valueDB.setValue(
		{
			commandClass: CommandClasses["Multi Channel"],
			property: "interviewComplete",
		},
		true,
	);
	node.valueDB.setValue(
		{
			commandClass: CommandClasses["Multi Channel"],
			property: "individualCount",
		},
		5,
	);

	node.valueDB.setValue(
		{
			commandClass: CommandClasses["Multi Channel"],
			endpoint: 5,
			property: "deviceClass",
		},
		{
			generic: 0x03,
			specific: 0x12, // Doorbell
		},
	);

	const actual = node.getEndpoint(5);
	t.is(actual?.deviceClass?.specific.label, "Doorbell");
});
