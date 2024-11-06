import {
	MultilevelSwitchCCValues,
	SupervisionCCGet,
	SupervisionCCReport,
} from "@zwave-js/cc";
import {
	CommandClasses,
	Duration,
	SupervisionStatus,
	UNKNOWN_STATE,
} from "@zwave-js/core";
import {
	type MockNodeBehavior,
	ccCaps,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite.js";

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
				ccCaps({
					ccId: CommandClasses["Multilevel Switch"],
					isSupported: true,
					version: 4,
					defaultValue: UNKNOWN_STATE,
				}),
				CommandClasses.Supervision,
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			// When receiving a Supervision Get, first respond with "Working" and after a delay with "Success"
			const respondToSupervisionGet: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof SupervisionCCGet) {
						let cc = new SupervisionCCReport({
							nodeId: controller.ownNodeId,
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

						cc = new SupervisionCCReport({
							nodeId: controller.ownNodeId,
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

			t.expect(node.getValue(targetValueId)).toBe(UNKNOWN_STATE);
			t.expect(node.getValue(currentValueId)).toBe(UNKNOWN_STATE);

			await node.setValue(targetValueId, 55);

			t.expect(node.getValue(targetValueId)).toBe(55);
			t.expect(node.getValue(currentValueId)).toBe(UNKNOWN_STATE);

			// Unchanged after 0.5s
			await wait(500);
			t.expect(node.getValue(targetValueId)).toBe(55);
			t.expect(node.getValue(currentValueId)).toBe(UNKNOWN_STATE);

			// Updated after 2.5s
			await wait(2000);
			t.expect(node.getValue(targetValueId)).toBe(55);
			t.expect(node.getValue(currentValueId)).toBe(55);
		},
	},
);
