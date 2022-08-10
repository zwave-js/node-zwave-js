import {
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCSet,
	BinarySwitchCCValues,
	SupervisionCCGet,
	SupervisionCCReport,
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
	"setValue with failed supervised command: expect validation GET",
	{
		// debug: true,
		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		nodeCapabilities: {
			commandClasses: [
				CommandClasses["Binary Switch"],
				CommandClasses.Supervision,
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Have the node respond to all Supervision Get negatively
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
							status: SupervisionStatus.Fail,
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
			mockNode.defineBehavior(
				respondToSupervisionGet,
				respondToBinarySwitchGet,
			);
		},
		testBody: async (driver, node, mockController, mockNode) => {
			await node.setValue(BinarySwitchCCValues.targetValue.id, true);

			await wait(1000);

			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof SupervisionCCGet &&
					frame.payload.encapsulated instanceof BinarySwitchCCSet,
				{
					errorMessage:
						"Node should have received a supervised BinarySwitchCCSet",
				},
			);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof BinarySwitchCCGet,
				{
					errorMessage:
						"Node should have received a BinarySwitchCCGet",
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
	},
);
