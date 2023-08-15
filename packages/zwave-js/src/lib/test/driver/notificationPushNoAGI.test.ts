import {
	NotificationCCGet,
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { CommandClasses } from "@zwave-js/core";
import {
	MockZWaveFrameType,
	ccCaps,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Notification CC: Push nodes without AGI support are detected as push, not pull",
	{
		// Repro of #6143
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses.Association,

				ccCaps({
					ccId: CommandClasses.Notification,
					version: 2,
					notificationTypesAndEvents: {
						[0x06]: [], // Access Control, no support for discovering events in V2
						[0x07]: [], // Home Security, no support for discovering events in V2
					},
				}),
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			const respondToNotificationGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof NotificationCCGet
					) {
						const notificationType =
							frame.payload.notificationType || 0x06;
						const cc = new NotificationCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							notificationType,
							notificationEvent:
								notificationType === 0x06
									? 0x06 /* Keypad unlock */
									: 0xfe,
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
			mockNode.defineBehavior(respondToNotificationGet);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const notificationMode = node.getValue(
				NotificationCCValues.notificationMode.id,
			);
			t.is(notificationMode, "push");
		},
	},
);
