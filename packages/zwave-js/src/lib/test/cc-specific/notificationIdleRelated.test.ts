import {
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

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

			let cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
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

			t.is(node.getValue(lockStateValueId), 0x0b /* Lock jammed */);

			cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
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

			t.is(node.getValue(lockStateValueId), 0x00 /* Idle */);
		},
	},
);
