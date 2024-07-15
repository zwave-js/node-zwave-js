import {
	NotificationCCEventSupportedGet,
	NotificationCCEventSupportedReport,
	NotificationCCSupportedGet,
	NotificationCCSupportedReport,
} from "@zwave-js/cc/NotificationCC";
import { CommandClasses } from "@zwave-js/core";
import type { NotificationCCCapabilities } from "@zwave-js/testing";
import { type MockNodeBehavior } from "@zwave-js/testing";

const defaultCapabilities: NotificationCCCapabilities = {
	supportsV1Alarm: false,
	notificationTypesAndEvents: {}, // none
};

const respondToNotificationSupportedGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof NotificationCCSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Notification,
					receivedCC.endpointIndex,
				),
			};
			const cc = new NotificationCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportsV1Alarm: capabilities.supportsV1Alarm,
				supportedNotificationTypes: Object.keys(
					capabilities.notificationTypesAndEvents,
				).map((t) => parseInt(t)),
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToNotificationEventSupportedGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof NotificationCCEventSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Notification,
					receivedCC.endpointIndex,
				),
			};
			if (
				receivedCC.notificationType
					in capabilities.notificationTypesAndEvents
			) {
				const cc = new NotificationCCEventSupportedReport(self.host, {
					nodeId: controller.host.ownNodeId,
					notificationType: receivedCC.notificationType,
					supportedEvents: capabilities.notificationTypesAndEvents[
						receivedCC.notificationType
					],
				});
				return { action: "sendCC", cc };
			}
			return { action: "stop" };
		}
	},
};

export const NotificationCCBehaviors = [
	respondToNotificationSupportedGet,
	respondToNotificationEventSupportedGet,
];
