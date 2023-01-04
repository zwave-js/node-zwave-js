import { BasicCCGet, BasicCCReport } from "@zwave-js/cc";
import {
	createMockZWaveRequestFrame,
	MockNodeBehavior,
	MockZWaveFrameType,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Correctly capture node updates that arrive before the SendData callback",
	{
		// debug: true,
		provisioningDirectory: path.join(__dirname, "fixtures/base_2_nodes"),

		// nodeCapabilities: {
		// 	commandClasses: [
		// 		{
		// 			ccId: CommandClasses["Z-Wave Plus Info"],
		// 			isSupported: true,
		// 			version: 2,
		// 		},
		// 	],
		// },

		testBody: async (driver, node, _mockController, mockNode) => {
			// Make the node respond first before ACKing the command
			mockNode.autoAckControllerFrames = false;

			const respondToBasicGetWithDelayedAck: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof BasicCCGet
					) {
						const cc = new BasicCCReport(controller.host, {
							nodeId: self.id,
							currentValue: 55,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						await wait(100);

						await self.ackControllerRequestFrame(frame);
						return true;
					}
					return false;
				},
			};
			mockNode.defineBehavior(respondToBasicGetWithDelayedAck);

			const result = await node.commandClasses.Basic.get();
			expect(result?.currentValue).toBe(55);
		},
	},
);
