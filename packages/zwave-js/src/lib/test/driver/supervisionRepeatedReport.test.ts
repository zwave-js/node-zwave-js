import {
	MultilevelSwitchCCValues,
	SupervisionCCGet,
	SupervisionCCReport,
} from "@zwave-js/cc";
import { CommandClasses, SupervisionStatus } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockZWaveFrameType,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"value updates work correctly when SupervisionReport is repeated",
	{
		// debug: true,
		// We need the cache to skip the CC interviews and mark S0 as supported
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/supervisionRepeatedReport",
		),

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses["Multilevel Switch"],
					isSupported: true,
					version: 4,
				},
				{
					ccId: CommandClasses.Supervision,
					isSupported: true,
					secure: false,
				},
			],
		},

		additionalDriverOptions: {
			disableOptimisticValueUpdate: true,
		},

		customSetup: async (driver, controller, mockNode) => {
			// Just have the node respond to all Supervision Get positively
			const respondToSupervisionGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof SupervisionCCGet
					) {
						const cc = new SupervisionCCReport(controller.host, {
							nodeId: self.id,
							sessionId: frame.payload.sessionId,
							moreUpdatesFollow: false,
							status: SupervisionStatus.Success,
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
			mockNode.defineBehavior(respondToSupervisionGet);
		},

		testBody: async (driver, node, _mockController, _mockNode) => {
			const promise = node.setValue(
				MultilevelSwitchCCValues.targetValue.id,
				77,
			);

			let currentValue = node.getValue(
				MultilevelSwitchCCValues.currentValue.id,
			);
			expect(currentValue).not.toBe(77);

			await promise;

			currentValue = node.getValue(
				MultilevelSwitchCCValues.currentValue.id,
			);
			expect(currentValue).toBe(77);

			// await node.commandClasses["Multilevel Switch"].startLevelChange({
			// 	direction: "up",
			// 	ignoreStartLevel: true,
			// });
			// // We take the driver asking for a nonce for a sign that it correctly identified the CC as needing S0
			// mockController.assertReceivedHostMessage(
			// 	(msg) =>
			// 		msg instanceof SendDataRequest &&
			// 		msg.command instanceof SecurityCCNonceGet,
			// 	{
			// 		errorMessage:
			// 			"The driver should have sent an S0-encapsulated command",
			// 	},
			// );
			// await wait(1000);
		},
	},
);
