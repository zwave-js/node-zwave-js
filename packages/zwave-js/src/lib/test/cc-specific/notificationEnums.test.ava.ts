import {
	NotificationCCEventSupportedGet,
	NotificationCCEventSupportedReport,
	NotificationCCReport,
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
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Notifications with enum event parameters are evaluated correctly",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [CommandClasses.Notification],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Node supports the Water Valve notifications Valve Operation Status
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
								supportedNotificationTypes: [0x0f],
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
						frame.payload.notificationType === 0x0f
					) {
						const cc = new NotificationCCEventSupportedReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								notificationType: 0x0f,
								supportedEvents: [0x01],
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

		testBody: async (t, driver, node, mockController, mockNode) => {
			await node.commandClasses.Notification.getSupportedEvents(0x0f);

			const valveOperationStatusId =
				NotificationCCValues.notificationVariable(
					"Water Valve",
					"Valve operation status",
				).id;

			const states = (
				node.getValueMetadata(
					valveOperationStatusId,
				) as ValueMetadataNumeric
			).states;
			t.deepEqual(states, {
				// For the valve operation status variable, the embedded enum replaces its possible states
				// since there is only one meaningless state, so it doesn't make sense to preserve it
				// This is different from the "Door state" value which has multiple states AND enums
				[0x0100]: "Off / Closed",
				[0x0101]: "On / Open",
			});

			// Send notifications to the node
			let cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x0f,
				notificationEvent: 0x01,
				eventParameters: Buffer.from([0x00]), // Off / Closed
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			// wait a bit for the value to be updated
			await wait(100);

			let value = node.getValue(valveOperationStatusId);
			t.is(value, 0x0100);

			cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x0f,
				notificationEvent: 0x01,
				eventParameters: Buffer.from([0x01]), // On / Open
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(100);

			value = node.getValue(valveOperationStatusId);
			t.is(value, 0x0101);
		},
	},
);

integrationTest(
	"Notification types multiple states and optional enums merge/extend states for all of them",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [CommandClasses.Notification],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Node supports the Access Control notifications Window open and Window closed
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
								supportedNotificationTypes: [0x06],
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
						frame.payload.notificationType === 0x06
					) {
						const cc = new NotificationCCEventSupportedReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								notificationType: 0x06,
								supportedEvents: [0x16, 0x17],
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
			await node.commandClasses.Notification.getSupportedEvents(0x06);

			const states = (
				node.getValueMetadata(
					NotificationCCValues.notificationVariable(
						"Access Control",
						"Door state",
					).id,
				) as ValueMetadataNumeric
			).states;
			t.deepEqual(states, {
				[0x16]: "Window/door is open",
				[0x17]: "Window/door is closed",
				// The Door state notification type has an enum for the "open" state
				// We add synthetic values for these (optional!) states in addition to the actual values
				[0x1600]: "Window/door is open in regular position",
				[0x1601]: "Window/door is open in tilt position",
			});
		},
	},
);
