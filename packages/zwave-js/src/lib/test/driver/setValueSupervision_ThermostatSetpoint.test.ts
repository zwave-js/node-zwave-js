import {
	SupervisionCCGet,
	SupervisionCCReport,
	ThermostatSetpointCCValues,
	ThermostatSetpointType,
} from "@zwave-js/cc";
import { CommandClasses, SupervisionStatus } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockNodeBehavior,
	MockZWaveFrameType,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Regression test for #4957: Value update after supervised Thermostat Setpoint Set",
	{
		debug: true,
		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		nodeCapabilities: {
			commandClasses: [
				CommandClasses["Thermostat Setpoint"],
				CommandClasses.Supervision,
			],
		},

		customSetup: async (_driver, _controller, mockNode) => {
			// Just have the node respond to all Supervision Get positively
			const respondToSupervisionGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof SupervisionCCGet
					) {
						const cc = new SupervisionCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
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
		testBody: async (_driver, node, _mockController, _mockNode) => {
			const onValueChange = jest.fn();
			node.on("value added", onValueChange);
			node.on("value updated", onValueChange);

			const setpointValueId = ThermostatSetpointCCValues.setpoint(
				ThermostatSetpointType.Cooling,
			).id;
			await node.setValue(setpointValueId, 20);

			await wait(500);

			const setpoint = node.getValue(setpointValueId);
			expect(setpoint).toBe(20);

			// And make sure the value event handlers are called
			expect(onValueChange).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					property: setpointValueId.property,
					propertyKey: setpointValueId.propertyKey,
					newValue: 20,
				}),
			);
		},
	},
);
