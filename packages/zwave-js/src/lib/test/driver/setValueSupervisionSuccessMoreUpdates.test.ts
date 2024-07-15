import {
	SupervisionCCGet,
	SupervisionCCReport,
	ThermostatSetpointCCValues,
	ThermostatSetpointType,
} from "@zwave-js/cc";
import { CommandClasses, SupervisionStatus } from "@zwave-js/core";
import { type MockNodeBehavior } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import sinon from "sinon";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	`Regression test for #4957: Treat Supervision Report with Success but "more updates follow" as final`,
	{
		// debug: true,
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
			// Just have the node respond to all Supervision Get positively, but claim that more updates follow
			const respondToSupervisionGet: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof SupervisionCCGet) {
						const cc = new SupervisionCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							sessionId: receivedCC.sessionId,
							moreUpdatesFollow: true, // <-- this is the important part
							status: SupervisionStatus.Success,
						});
						await wait(500);
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToSupervisionGet);
		},
		testBody: async (t, driver, node, _mockController, _mockNode) => {
			const onValueChange = sinon.spy();
			// node.on("value added", onValueChange);
			node.on("value updated", onValueChange);

			const setpointValueId = ThermostatSetpointCCValues.setpoint(
				ThermostatSetpointType.Cooling,
			).id;
			// Ensure we get a "value updated" event
			node.valueDB.setValue(setpointValueId, 0, { noEvent: true });

			await node.setValue(setpointValueId, 20);

			await wait(500);

			const setpoint = node.getValue(setpointValueId);
			t.is(setpoint, 20);

			// And make sure the value event handlers are called
			sinon.assert.calledWith(
				onValueChange,
				sinon.match.any,
				sinon.match({
					property: setpointValueId.property,
					propertyKey: setpointValueId.propertyKey,
					newValue: 20,
				}),
			);
		},
	},
);
