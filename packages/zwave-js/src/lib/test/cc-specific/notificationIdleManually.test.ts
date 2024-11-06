import {
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest("Notification values can get idled manually", {
	// debug: true,
	provisioningDirectory: path.join(__dirname, "fixtures/notificationCC"),

	testBody: async (t, driver, node, mockController, mockNode) => {
		const alarmStatusValueId = NotificationCCValues.notificationVariable(
			"Smoke Alarm",
			"Alarm status",
		).id;

		let cc = new NotificationCCReport({
			nodeId: mockController.ownNodeId,
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
		t.expect(node.getValue(alarmStatusValueId) /* Smoke alarm test */).toBe(
			0x03,
		);

		// Trying to idle a different value does not work
		node.manuallyIdleNotificationValue(0x01, 0x06 /* Alarm silenced */);
		t.expect(node.getValue(alarmStatusValueId) /* Smoke alarm test */).toBe(
			0x03,
		);

		// Idling the correct value does work
		node.manuallyIdleNotificationValue(0x01, 0x03);
		t.expect(node.getValue(alarmStatusValueId) /* Idle */).toBe(0x00);

		// Now try one that cannot be idled

		const doorStateValueId = NotificationCCValues.notificationVariable(
			"Access Control",
			"Door state",
		).id;

		cc = new NotificationCCReport({
			nodeId: mockController.ownNodeId,
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

		t.expect(node.getValue(doorStateValueId) /* Door state */).toBe(0x16);

		node.manuallyIdleNotificationValue(0x06, 0x16);
		// Unchanged
		t.expect(node.getValue(doorStateValueId) /* Door state */).toBe(0x16);
	},
});

integrationTest(
	"node.manuallyIdleNotificationValue can accept ValueID as input",
	{
		// debug: true,
		provisioningDirectory: path.join(__dirname, "fixtures/notificationCC"),

		testBody: async (t, driver, node, mockController, mockNode) => {
			const alarmStatusValueId =
				NotificationCCValues.notificationVariable(
					"Smoke Alarm",
					"Alarm status",
				).id;

			let cc = new NotificationCCReport({
				nodeId: mockController.ownNodeId,
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
			t.expect(
				node.getValue(alarmStatusValueId), /* Smoke alarm test */
			).toBe(0x03);

			// Idling with a valueId does work
			node.manuallyIdleNotificationValue(alarmStatusValueId);
			t.expect(node.getValue(alarmStatusValueId) /* Idle */).toBe(0x00);

			// Now try one that cannot be idled

			const doorStateValueId = NotificationCCValues.notificationVariable(
				"Access Control",
				"Door state",
			).id;

			cc = new NotificationCCReport({
				nodeId: mockController.ownNodeId,
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

			t.expect(node.getValue(doorStateValueId) /* Door state */).toBe(
				0x16,
			);

			node.manuallyIdleNotificationValue(doorStateValueId);
			// Unchanged
			t.expect(node.getValue(doorStateValueId) /* Door state */).toBe(
				0x16,
			);
		},
	},
);
