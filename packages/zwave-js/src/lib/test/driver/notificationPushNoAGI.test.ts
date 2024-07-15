import {
	NotificationCCGet,
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { CommandClasses } from "@zwave-js/core";
import { type MockNodeBehavior, ccCaps } from "@zwave-js/testing";
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
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof NotificationCCGet) {
						const notificationType = receivedCC.notificationType
							|| 0x06;
						const cc = new NotificationCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							notificationType,
							notificationEvent: notificationType === 0x06
								? 0x06 /* Keypad unlock */
								: 0xfe,
						});
						return { action: "sendCC", cc };
					}
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
