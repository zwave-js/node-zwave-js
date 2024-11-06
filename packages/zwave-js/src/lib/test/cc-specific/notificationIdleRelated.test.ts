import {
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"When receiving a NotificationCC::Report with an event that has idleVariables configured, the referenced variables get idled",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/notificationAndDoorLockCC",
		),

		testBody: async (t, driver, node, mockController, mockNode) => {
			const lockStateValueId = NotificationCCValues.notificationVariable(
				"Access Control",
				"Lock state",
			).id;

			let cc = new NotificationCCReport({
				nodeId: mockController.ownNodeId,
				notificationType: 0x06, // Access Control,
				notificationEvent: 0x0b, // Lock jammed
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			// wait a bit for the value to be updated
			await wait(100);

			t.expect(node.getValue(lockStateValueId) /* Lock jammed */).toBe(
				0x0b,
			);

			cc = new NotificationCCReport({
				nodeId: mockController.ownNodeId,
				notificationType: 0x06, // Access Control,
				notificationEvent: 0x06, // Keypad Unlock Operation
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			// wait a bit for the value to be updated
			await wait(100);

			t.expect(node.getValue(lockStateValueId) /* Idle */).toBe(0x00);
		},
	},
);
