import {
	MultilevelSwitchCCGet,
	MultilevelSwitchCCReport,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCValues,
	SupervisionCCGet,
	SupervisionCCReport,
} from "@zwave-js/cc";
import { CommandClasses, SupervisionStatus } from "@zwave-js/core";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"successful supervised setValue(255) with duration: expect validation GET",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses["Multilevel Switch"],
				CommandClasses.Supervision,
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Just have the node respond to all Supervision Get positively
			const respondToSupervisionGet: MockNodeBehavior = {
				onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof SupervisionCCGet
					) {
						const cc = new SupervisionCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							sessionId: frame.payload.sessionId,
							moreUpdatesFollow: false,
							status: SupervisionStatus.Success,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToSupervisionGet);

			// Except the ones with a duration in the command, those need special handling
			const respondToSupervisionGetWithDuration: MockNodeBehavior = {
				onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof SupervisionCCGet
						&& frame.payload.encapsulated
							instanceof MultilevelSwitchCCSet
						&& !!frame.payload.encapsulated.duration
							?.toMilliseconds()
					) {
						const cc1 = new SupervisionCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							sessionId: frame.payload.sessionId,
							moreUpdatesFollow: true,
							status: SupervisionStatus.Working,
							duration: frame.payload.encapsulated.duration,
						});

						const cc2 = new SupervisionCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							sessionId: frame.payload.sessionId,
							moreUpdatesFollow: false,
							status: SupervisionStatus.Success,
						});

						void self.sendToController(
							createMockZWaveRequestFrame(cc1, {
								ackRequested: false,
							}),
						);

						setTimeout(
							() => {
								void self.sendToController(
									createMockZWaveRequestFrame(cc2, {
										ackRequested: false,
									}),
								);
							},
							frame.payload.encapsulated.duration
								.toMilliseconds(),
						);

						return { action: "stop" };
					}
				},
			};
			mockNode.defineBehavior(respondToSupervisionGetWithDuration);

			let lastBrightness = 88;
			let currentBrightness = 0;
			const respondToMultilevelSwitchSet: MockNodeBehavior = {
				onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof MultilevelSwitchCCSet
					) {
						const targetValue = frame.payload.targetValue;
						if (targetValue === 255) {
							currentBrightness = lastBrightness;
						} else {
							currentBrightness = targetValue;
							if (currentBrightness > 0) {
								lastBrightness = currentBrightness;
							}
						}

						return { action: "ok" };
					}
				},
			};
			mockNode.defineBehavior(respondToMultilevelSwitchSet);

			// Report Multilevel Switch status
			const respondToMultilevelSwitchGet: MockNodeBehavior = {
				onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof MultilevelSwitchCCGet
					) {
						const cc = new MultilevelSwitchCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							targetValue: 88,
							currentValue: 88,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToMultilevelSwitchGet);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// await node.setValue(MultilevelSwitchCCValues.targetValue.id, 55);
			// await node.setValue(MultilevelSwitchCCValues.targetValue.id, 0);

			// await wait(500);

			// mockNode.clearReceivedControllerFrames();

			await node.setValue(MultilevelSwitchCCValues.targetValue.id, 255, {
				transitionDuration: "1s",
			});

			await wait(500);

			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof SupervisionCCGet
					&& frame.payload.encapsulated
						instanceof MultilevelSwitchCCSet,
				{
					errorMessage:
						"Node should have received a supervised MultilevelSwitchCCSet",
				},
			);

			await wait(1000);

			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof MultilevelSwitchCCGet,
				{
					errorMessage:
						"Node should have received a MultilevelSwitchCCGet",
				},
			);

			// The current value should NOT be updated to 255
			const currentValue = node.getValue(
				MultilevelSwitchCCValues.currentValue.id,
			);
			t.is(currentValue, 88);
		},
	},
);
