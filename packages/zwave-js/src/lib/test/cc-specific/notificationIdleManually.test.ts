import {
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest("Notification values can get idled manually", {
	// debug: true,
	provisioningDirectory: path.join(__dirname, "fixtures/notificationCC"),

	testBody: async (t, driver, node, mockController, mockNode) => {
		const alarmStatusValueId = NotificationCCValues.notificationVariable(
			"Smoke Alarm",
			"Alarm status",
		).id;

		let cc = new NotificationCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			notificationType: 0x01, // Smoke Alarm
			notificationEvent: 0x03, // Smoke alarm test
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);
		// wait a bit for the value to be updated
		await wait(100);
		t.is(node.getValue(alarmStatusValueId), 0x03 /* Smoke alarm test */);

		// Trying to idle a different value does not work
		node.manuallyIdleNotificationValue(0x01, 0x06 /* Alarm silenced */);
		t.is(node.getValue(alarmStatusValueId), 0x03 /* Smoke alarm test */);

		// Idling the correct value does work
		node.manuallyIdleNotificationValue(0x01, 0x03);
		t.is(node.getValue(alarmStatusValueId), 0x00 /* Idle */);

		// Now try one that cannot be idled

		const doorStateValueId = NotificationCCValues.notificationVariable(
			"Access Control",
			"Door state",
		).id;

		cc = new NotificationCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			notificationType: 0x06, // Access Control
			notificationEvent: 0x16, // Door state
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);
		// wait a bit for the value to be updated
		await wait(100);

		t.is(node.getValue(doorStateValueId), 0x16 /* Door state */);

		node.manuallyIdleNotificationValue(0x06, 0x16);
		// Unchanged
		t.is(node.getValue(doorStateValueId), 0x16 /* Door state */);
	},
});
