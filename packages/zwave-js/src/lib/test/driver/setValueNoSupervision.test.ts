import {
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCSet,
	BinarySwitchCCValues,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { type MockNodeBehavior, MockZWaveFrameType } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest("setValue without supervision: expect validation GET", {
	// debug: true,
	// provisioningDirectory: path.join(
	// 	__dirname,
	// 	"__fixtures/supervision_binary_switch",
	// ),

	nodeCapabilities: {
		commandClasses: [CommandClasses["Binary Switch"]],
	},

	customSetup: async (driver, controller, mockNode) => {
		mockNode.addCC(CommandClasses["Binary Switch"], {
			isSupported: true,
		});

		// and always report OFF
		const respondToBinarySwitchGet: MockNodeBehavior = {
			handleCC(controller, self, receivedCC) {
				if (receivedCC instanceof BinarySwitchCCGet) {
					const cc = new BinarySwitchCCReport(self.host, {
						nodeId: controller.host.ownNodeId,
						currentValue: false,
					});
					return { action: "sendCC", cc };
				}
			},
		};
		mockNode.defineBehavior(respondToBinarySwitchGet);
	},
	testBody: async (t, driver, node, mockController, mockNode) => {
		await node.setValue(BinarySwitchCCValues.targetValue.id, true);

		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof BinarySwitchCCSet,
			{
				errorMessage:
					"Node should have received a non-supervised BinarySwitchCCSet",
			},
		);

		await wait(1500);

		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof BinarySwitchCCGet,
			{
				errorMessage: "Node should have received a BinarySwitchCCGet",
			},
		);

		mockNode.assertSentControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request
				&& frame.payload instanceof BinarySwitchCCReport
				&& frame.payload.currentValue === false,
			{
				errorMessage:
					"Node should have sent a BinarySwitchCCReport with currentValue false",
			},
		);

		t.pass();
	},
});
