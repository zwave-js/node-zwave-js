import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { afterEach, beforeEach, test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../../Testing.js";
import type { Driver } from "../../driver/Driver.js";
import { createAndStartTestingDriver } from "../../driver/DriverMock.js";
import { DeviceClass } from "../../node/DeviceClass.js";
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

beforeEach<LocalTestContext>(({ context, expect }) => {
	const { driver } = context;
	const node = new ZWaveNode(
		2,
		driver,
		new DeviceClass(0x04, 0x01, 0x01), // Portable Remote Controller
	);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node.id,
		node,
	);
	context.node = node;
});

afterEach<LocalTestContext>(({ context, expect }) => {
	const { driver, node } = context;

	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(node.id);
	node.valueDB.clear();
	node.destroy();
	driver.networkCache.clear();
});

test.sequential("throws when a negative endpoint index is requested", ({ context, expect }) => {
	const { node } = context;
	assertZWaveError(expect, () => node.getEndpoint(-1), {
		errorCode: ZWaveErrorCodes.Argument_Invalid,
		messageMatches: "must be positive",
	});
});

test.sequential("returns the node itself when endpoint 0 is requested", ({ context, expect }) => {
	const { node } = context;
	expect(node.getEndpoint(0)).toBe(node);
});

test.sequential(
	"returns a new endpoint with the correct endpoint index otherwise",
	({ context, expect }) => {
		const { node } = context;

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
		expect(actual.index).toBe(5);
		expect(actual.nodeId).toBe(2);
	},
);

test.sequential("caches the created endpoint instances", ({ context, expect }) => {
	const { node } = context;

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
	expect(first).toBeDefined();
	expect(first).toBe(second);
});

test.sequential(
	"returns undefined if a non-existent endpoint is requested",
	({ context, expect }) => {
		const { node } = context;
		const actual = node.getEndpoint(5);
		expect(actual).toBeUndefined();
	},
);

test.sequential("sets the correct device class for the endpoint", async ({ context, expect }) => {
	const { node } = context;

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
	expect(actual?.deviceClass?.specific.label).toBe("Doorbell");
});
