import {
	NotificationCCEventSupportedGet,
	NotificationCCEventSupportedReport,
	NotificationCCSupportedGet,
	NotificationCCSupportedReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { CommandClasses, ValueMetadataNumeric } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockZWaveFrameType,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Notification types with multiple supported events preserve states for all of them",
	{
		// debug: true,
		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		nodeCapabilities: {
			commandClasses: [CommandClasses.Notification],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Node supports the Smoke Alarm notifications Smoke alarm test, Alarm silenced (and idle)
			const respondToNotificationSupportedGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof NotificationCCSupportedGet
					) {
						const cc = new NotificationCCSupportedReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								supportsV1Alarm: false,
								supportedNotificationTypes: [0x01],
							},
						);
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
			mockNode.defineBehavior(respondToNotificationSupportedGet);

			const respondToNotificationEventSupportedGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof
							NotificationCCEventSupportedGet &&
						frame.payload.notificationType === 0x01
					) {
						const cc = new NotificationCCEventSupportedReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								notificationType: 0x01,
								supportedEvents: [0x03, 0x06],
							},
						);
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
			mockNode.defineBehavior(respondToNotificationEventSupportedGet);
		},

		testBody: async (t, driver, node, _mockController, _mockNode) => {
			await node.commandClasses.Notification.getSupportedEvents(0x01);

			const states = (
				node.getValueMetadata(
					NotificationCCValues.notificationVariable(
						"Smoke Alarm",
						"Alarm status",
					).id,
				) as ValueMetadataNumeric
			).states;
			t.deepEqual(states, {
				[0x00]: "idle",
				[0x03]: "Smoke alarm test",
				[0x06]: "Alarm silenced",
			});
		},
	},
);
