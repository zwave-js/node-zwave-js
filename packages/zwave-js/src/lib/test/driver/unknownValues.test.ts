import {
	MultilevelSwitchCCReport,
	MultilevelSwitchCCValues,
} from "@zwave-js/cc";
import { CommandClasses, NOT_YET_KNOWN, UNKNOWN_STATE } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(`Reports with the UNKNOWN state are correctly handled`, {
	// debug: true,
	// provisioningDirectory: path.join(
	// 	__dirname,
	// 	"__fixtures/supervision_binary_switch",
	// ),

	nodeCapabilities: {
		commandClasses: [CommandClasses["Multilevel Switch"]],
	},

	// customSetup: async (_driver, _controller, mockNode) => {
	// 	// When receiving a Supervision Get, first respond with "Working" and after a delay with "Success"
	// 	const respondToSupervisionGet: MockNodeBehavior = {
	// 		async onControllerFrame(controller, self, frame) {
	// 			if (
	// 				frame.type === MockZWaveFrameType.Request &&
	// 				frame.payload instanceof SupervisionCCGet
	// 			) {
	// 				let cc = new SupervisionCCReport(self.host, {
	// 					nodeId: controller.host.ownNodeId,
	// 					sessionId: frame.payload.sessionId,
	// 					moreUpdatesFollow: true,
	// 					status: SupervisionStatus.Working,
	// 					duration: new Duration(10, "seconds"),
	// 				});
	// 				await self.sendToController(
	// 					createMockZWaveRequestFrame(cc, {
	// 						ackRequested: false,
	// 					}),
	// 				);

	// 				await wait(2000);

	// 				cc = new SupervisionCCReport(self.host, {
	// 					nodeId: controller.host.ownNodeId,
	// 					sessionId: frame.payload.sessionId,
	// 					moreUpdatesFollow: false,
	// 					status: SupervisionStatus.Success,
	// 				});
	// 				await self.sendToController(
	// 					createMockZWaveRequestFrame(cc, {
	// 						ackRequested: false,
	// 					}),
	// 				);

	// 				return true;
	// 			}
	// 			return false;
	// 		},
	// 	};
	// 	mockNode.defineBehavior(respondToSupervisionGet);
	// },
	testBody: async (t, driver, node, mockController, mockNode) => {
		const targetValueId = MultilevelSwitchCCValues.targetValue.id;
		const currentValueId = MultilevelSwitchCCValues.currentValue.id;

		// At the start, values are not known yet
		t.is(node.getValue(targetValueId), NOT_YET_KNOWN);
		t.is(node.getValue(currentValueId), NOT_YET_KNOWN);

		// Send an initial state
		let cc = new MultilevelSwitchCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			currentValue: 0,
			targetValue: 0,
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);

		// wait a bit for the change to propagate
		await wait(100);

		t.is(node.getValue(targetValueId), 0);
		t.is(node.getValue(currentValueId), 0);

		// Send an update with UNKNOWN state
		cc = new MultilevelSwitchCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			currentValue: 254,
			targetValue: 254,
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);

		// wait a bit for the change to propagate
		await wait(100);

		t.is(node.getValue(targetValueId), UNKNOWN_STATE);
		t.is(node.getValue(currentValueId), UNKNOWN_STATE);
	},
});
