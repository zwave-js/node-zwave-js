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
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

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
					const cc = new BasicCCReport(self.host, {
						nodeId: controller.host.ownNodeId,
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
		t.is(node.getValue(targetValueId), 0);
		t.is(node.getValue(currentValueId), 0);

		// Send an update with UNKNOWN state
		const cc = new BasicCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
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

		t.is(node.getValue(targetValueId), UNKNOWN_STATE);
		t.is(node.getValue(currentValueId), UNKNOWN_STATE);
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
			commandClasses: [CommandClasses["Multilevel Switch"]],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const targetValueId = MultilevelSwitchCCValues.targetValue.id;
			const currentValueId = MultilevelSwitchCCValues.currentValue.id;

			// At the start, values are not known yet
			t.is(node.getValue(targetValueId), NOT_KNOWN);
			t.is(node.getValue(currentValueId), NOT_KNOWN);

			// Send an initial state
			let cc = new MultilevelSwitchCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
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

			t.is(node.getValue(targetValueId), 0);
			t.is(node.getValue(currentValueId), 0);

			// Send an update with UNKNOWN state
			cc = new MultilevelSwitchCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
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

			t.is(node.getValue(targetValueId), UNKNOWN_STATE);
			t.is(node.getValue(currentValueId), UNKNOWN_STATE);
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
			commandClasses: [CommandClasses["Binary Switch"]],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const targetValueId = BinarySwitchCCValues.targetValue.id;
			const currentValueId = BinarySwitchCCValues.currentValue.id;

			// At the start, values are not known yet
			t.is(node.getValue(targetValueId), NOT_KNOWN);
			t.is(node.getValue(currentValueId), NOT_KNOWN);

			// Send an initial state
			let cc = new BinarySwitchCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
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

			t.is(node.getValue(targetValueId), false);
			t.is(node.getValue(currentValueId), false);

			// Send an update with UNKNOWN state
			cc = new BinarySwitchCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
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

			t.is(node.getValue(targetValueId), UNKNOWN_STATE);
			t.is(node.getValue(currentValueId), UNKNOWN_STATE);
		},
	},
);
