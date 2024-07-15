import {
	MultilevelSwitchCCValues,
	SupervisionCCGet,
	SupervisionCCReport,
} from "@zwave-js/cc";
import { CommandClasses, Duration, SupervisionStatus } from "@zwave-js/core";
import {
	type MockNodeBehavior,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	`Regression test for #5825: Update values when "Success" is received after an initial "Working" result`,
	{
		// debug: true,
		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		nodeCapabilities: {
			commandClasses: [
				CommandClasses["Multilevel Switch"],
				CommandClasses.Supervision,
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			// When receiving a Supervision Get, first respond with "Working" and after a delay with "Success"
			const respondToSupervisionGet: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof SupervisionCCGet) {
						let cc = new SupervisionCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							sessionId: receivedCC.sessionId,
							moreUpdatesFollow: true,
							status: SupervisionStatus.Working,
							duration: new Duration(10, "seconds"),
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						await wait(2000);

						cc = new SupervisionCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							sessionId: receivedCC.sessionId,
							moreUpdatesFollow: false,
							status: SupervisionStatus.Success,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						return { action: "stop" };
					}
				},
			};
			mockNode.defineBehavior(respondToSupervisionGet);
		},
		testBody: async (t, driver, node, _mockController, _mockNode) => {
			const targetValueId = MultilevelSwitchCCValues.targetValue.id;
			const currentValueId = MultilevelSwitchCCValues.currentValue.id;

			t.is(node.getValue(targetValueId), undefined);
			t.is(node.getValue(currentValueId), undefined);

			await node.setValue(targetValueId, 55);

			t.is(node.getValue(targetValueId), 55);
			t.is(node.getValue(currentValueId), undefined);

			// Unchanged after 0.5s
			await wait(500);
			t.is(node.getValue(targetValueId), 55);
			t.is(node.getValue(currentValueId), undefined);

			// Updated after 2.5s
			await wait(2000);
			t.is(node.getValue(targetValueId), 55);
			t.is(node.getValue(currentValueId), 55);
		},
	},
);
