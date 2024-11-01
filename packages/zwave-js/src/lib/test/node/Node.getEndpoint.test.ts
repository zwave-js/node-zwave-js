import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { afterEach, beforeAll, beforeEach, test } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Utils.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { DeviceClass } from "../../node/DeviceClass.js";
import { ZWaveNode } from "../../node/Node.js";

interface TestContext {
	driver: Driver;
	controller: MockController;
	node: ZWaveNode;
}

const test = ava as TestFn<TestContext>;

beforeAll(async (t) => {
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

afterAll(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

beforeEach((t) => {
	const { driver } = t.context;
	const node = new ZWaveNode(
		2,
		driver,
		new DeviceClass(0x04, 0x01, 0x01), // Portable Remote Controller
	);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node.id,
		node,
	);
	t.context.node = node;
});

afterEach((t) => {
	const { driver, node } = t.context;

	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(node.id);
	node.valueDB.clear();
	node.destroy();
	driver.networkCache.clear();
});

test.sequential("throws when a negative endpoint index is requested", (t) => {
	const { node } = t.context;
	assertZWaveError(t.expect, () => node.getEndpoint(-1), {
		errorCode: ZWaveErrorCodes.Argument_Invalid,
		messageMatches: "must be positive",
	});
});

test.sequential("returns the node itself when endpoint 0 is requested", (t) => {
	const { node } = t.context;
	t.expect(node.getEndpoint(0)).toBe(node);
});

test.sequential(
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
		t.expect(actual.index).toBe(5);
		t.expect(actual.nodeId).toBe(2);
	},
);

test.sequential("caches the created endpoint instances", (t) => {
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
	t.expect(first).toBeDefined();
	t.expect(first).toBe(second);
});

test.sequential(
	"returns undefined if a non-existent endpoint is requested",
	(t) => {
		const { node } = t.context;
		const actual = node.getEndpoint(5);
		t.expect(actual).toBeUndefined();
	},
);

test.sequential("sets the correct device class for the endpoint", async (t) => {
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
	t.expect(actual?.deviceClass?.specific.label).toBe("Doorbell");
});
