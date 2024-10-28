import { BasicCCGet, BasicCCReport } from "@zwave-js/cc";
import {
	type MockNodeBehavior,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
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

		testBody: async (t, driver, node, _mockController, mockNode) => {
			// Make the node respond first before ACKing the command
			mockNode.autoAckControllerFrames = false;

			const respondToBasicGetWithDelayedAck: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof BasicCCGet) {
						const cc = new BasicCCReport({
							nodeId: self.id,
							currentValue: 55,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						await wait(100);

						return { action: "ack" };
					}
				},
			};
			mockNode.defineBehavior(respondToBasicGetWithDelayedAck);

			const result = await node.commandClasses.Basic.get();
			t.is(result?.currentValue, 55);
		},
	},
);
