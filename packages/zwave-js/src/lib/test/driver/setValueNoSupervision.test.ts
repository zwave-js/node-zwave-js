import {
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCSet,
	BinarySwitchCCValues,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockNodeBehavior,
	MockZWaveFrameType,
} from "@zwave-js/testing";
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
			async onControllerFrame(controller, self, frame) {
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof BinarySwitchCCGet
				) {
					const cc = new BinarySwitchCCReport(self.host, {
						nodeId: controller.host.ownNodeId,
						currentValue: false,
					});
					await self.sendToController(
						createMockZWaveRequestFrame(cc, {
							ackRequested: false,
						}),
					);
					return true;
				}
				return false;
			},
		};
		mockNode.defineBehavior(respondToBinarySwitchGet);
	},
	testBody: async (driver, node, mockController, mockNode) => {
		await node.setValue(BinarySwitchCCValues.targetValue.id, true);

		await wait(1000);

		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request &&
				frame.payload instanceof BinarySwitchCCSet,
			{
				errorMessage:
					"Node should have received a non-supervised BinarySwitchCCSet",
			},
		);
		mockNode.assertReceivedControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request &&
				frame.payload instanceof BinarySwitchCCGet,
			{
				errorMessage: "Node should have received a BinarySwitchCCGet",
			},
		);

		mockNode.assertSentControllerFrame(
			(frame) =>
				frame.type === MockZWaveFrameType.Request &&
				frame.payload instanceof BinarySwitchCCReport &&
				frame.payload.currentValue === false,
			{
				errorMessage:
					"Node should have sent a BinarySwitchCCReport with currentValue false",
			},
		);
	},
});
