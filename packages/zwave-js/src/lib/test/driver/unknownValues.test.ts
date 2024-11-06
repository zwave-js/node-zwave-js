import {
	BasicCCGet,
	BasicCCReport,
	BasicCCValues,
	BinarySwitchCCReport,
	BinarySwitchCCValues,
	MultilevelSwitchCCReport,
	MultilevelSwitchCCValues,
} from "@zwave-js/cc";
import {
	CommandClasses,
	Duration,
	NOT_KNOWN,
	UNKNOWN_STATE,
} from "@zwave-js/core";
import {
	type MockNodeBehavior,
	ccCaps,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(`Basic Reports with the UNKNOWN state are correctly handled`, {
	// debug: true,
	// provisioningDirectory: path.join(
	// 	__dirname,
	// 	"__fixtures/supervision_binary_switch",
	// ),

	nodeCapabilities: {
		commandClasses: [
			CommandClasses.Version,
			{
				ccId: CommandClasses.Basic,
				version: 2,
				isSupported: true,
			},
		],
	},

	customSetup: async (driver, controller, mockNode) => {
		// Respond to Basic CC Get, so the driver doesn't assume Basic CC is unsupported
		const respondToBasicGet: MockNodeBehavior = {
			handleCC(controller, self, receivedCC) {
				if (receivedCC instanceof BasicCCGet) {
					const cc = new BasicCCReport({
						nodeId: controller.ownNodeId,
						currentValue: 0,
						targetValue: 0,
						duration: new Duration(0, "seconds"),
					});
					return { action: "sendCC", cc };
				}
			},
		};
		mockNode.defineBehavior(respondToBasicGet);
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		const targetValueId = BasicCCValues.targetValue.id;
		const currentValueId = BasicCCValues.currentValue.id;

		// At the start, values should be 0 as per the interview
		t.expect(node.getValue(targetValueId)).toBe(0);
		t.expect(node.getValue(currentValueId)).toBe(0);

		// Send an update with UNKNOWN state
		const cc = new BasicCCReport({
			nodeId: mockController.ownNodeId,
			currentValue: 254,
			targetValue: 254,
			duration: Duration.default(),
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);

		// wait a bit for the change to propagate
		await wait(100);

		t.expect(node.getValue(targetValueId)).toBe(UNKNOWN_STATE);
		t.expect(node.getValue(currentValueId)).toBe(UNKNOWN_STATE);
	},
});

integrationTest(
	`Multilevel Switch Reports with the UNKNOWN state are correctly handled`,
	{
		// debug: true,
		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		nodeCapabilities: {
			commandClasses: [ccCaps({
				ccId: CommandClasses["Multilevel Switch"],
				isSupported: true,
				version: 4,
				defaultValue: UNKNOWN_STATE,
			})],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const targetValueId = MultilevelSwitchCCValues.targetValue.id;
			const currentValueId = MultilevelSwitchCCValues.currentValue.id;

			// At the start, values are not known yet
			t.expect(node.getValue(targetValueId)).toBe(UNKNOWN_STATE);
			t.expect(node.getValue(currentValueId)).toBe(UNKNOWN_STATE);

			// Send an initial state
			let cc = new MultilevelSwitchCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: 0,
				targetValue: 0,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// wait a bit for the change to propagate
			await wait(100);

			t.expect(node.getValue(targetValueId)).toBe(0);
			t.expect(node.getValue(currentValueId)).toBe(0);

			// Send an update with UNKNOWN state
			cc = new MultilevelSwitchCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: 254,
				targetValue: 254,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// wait a bit for the change to propagate
			await wait(100);

			t.expect(node.getValue(targetValueId)).toBe(UNKNOWN_STATE);
			t.expect(node.getValue(currentValueId)).toBe(UNKNOWN_STATE);
		},
	},
);

integrationTest(
	`Binary Switch Reports with the UNKNOWN state are correctly handled`,
	{
		// debug: true,
		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["Binary Switch"],
					isSupported: true,
					defaultValue: NOT_KNOWN,
				}),
			],
		},

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const targetValueId = BinarySwitchCCValues.targetValue.id;
			const currentValueId = BinarySwitchCCValues.currentValue.id;

			// At the start, values are not known yet, because the interview was skipped
			t.expect(node.getValue(targetValueId)).toBe(NOT_KNOWN);
			t.expect(node.getValue(currentValueId)).toBe(NOT_KNOWN);

			// Send an initial state
			let cc = new BinarySwitchCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: false,
				targetValue: false,
				duration: new Duration(0, "seconds"),
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// wait a bit for the change to propagate
			await wait(100);

			t.expect(node.getValue(targetValueId)).toBe(false);
			t.expect(node.getValue(currentValueId)).toBe(false);

			// Send an update with UNKNOWN state
			cc = new BinarySwitchCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: UNKNOWN_STATE,
				targetValue: UNKNOWN_STATE,
				duration: Duration.default(),
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// wait a bit for the change to propagate
			await wait(100);

			t.expect(node.getValue(targetValueId)).toBe(UNKNOWN_STATE);
			t.expect(node.getValue(currentValueId)).toBe(UNKNOWN_STATE);
		},
	},
);
