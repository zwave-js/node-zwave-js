import {
	NotificationCCEventSupportedGet,
	NotificationCCEventSupportedReport,
	NotificationCCSupportedGet,
	NotificationCCSupportedReport,
} from "@zwave-js/cc/NotificationCC";
import { CommandClasses } from "@zwave-js/core";
import type { NotificationCCCapabilities } from "@zwave-js/testing";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const defaultCapabilities: NotificationCCCapabilities = {
	supportsV1Alarm: false,
	notificationTypesAndEvents: {}, // none
};

const respondToNotificationSupportedGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof NotificationCCSupportedGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Notification,
					frame.payload.endpointIndex,
				),
			};
			const cc = new NotificationCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportsV1Alarm: capabilities.supportsV1Alarm,
				supportedNotificationTypes: Object.keys(
					capabilities.notificationTypesAndEvents,
				).map((t) => parseInt(t)),
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

const respondToNotificationEventSupportedGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof NotificationCCEventSupportedGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Notification,
					frame.payload.endpointIndex,
				),
			};
			if (
				frame.payload.notificationType in
				capabilities.notificationTypesAndEvents
			) {
				const cc = new NotificationCCEventSupportedReport(self.host, {
					nodeId: controller.host.ownNodeId,
					notificationType: frame.payload.notificationType,
					supportedEvents:
						capabilities.notificationTypesAndEvents[
							frame.payload.notificationType
						],
				});
				await self.sendToController(
					createMockZWaveRequestFrame(cc, {
						ackRequested: false,
					}),
				);
				return true;
			}
		}
		return false;
	},
};

export const behaviors = [
	respondToNotificationSupportedGet,
	respondToNotificationEventSupportedGet,
];
