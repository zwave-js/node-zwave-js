import {
	MultilevelSwitchCCValues,
	SupervisionCCGet,
	SupervisionCCReport,
} from "@zwave-js/cc";
import { CommandClasses, SupervisionStatus } from "@zwave-js/core";
import { type MockNodeBehavior } from "@zwave-js/testing";
import path from "node:path";
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
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof SupervisionCCGet) {
						const cc = new SupervisionCCReport(controller.host, {
							nodeId: self.id,
							sessionId: receivedCC.sessionId,
							moreUpdatesFollow: false,
							status: SupervisionStatus.Success,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToSupervisionGet);
		},

		testBody: async (t, driver, node, _mockController, _mockNode) => {
			const promise = node.setValue(
				MultilevelSwitchCCValues.targetValue.id,
				77,
			);

			let currentValue = node.getValue(
				MultilevelSwitchCCValues.currentValue.id,
			);
			t.not(currentValue, 77);

			await promise;

			currentValue = node.getValue(
				MultilevelSwitchCCValues.currentValue.id,
			);
			t.is(currentValue, 77);

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
