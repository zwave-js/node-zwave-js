import { DoorLockMode } from "@zwave-js/cc";
import { DoorLockCCValues } from "@zwave-js/cc/DoorLockCC";
import { NotificationCCReport } from "@zwave-js/cc/NotificationCC";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"When receiving a NotificationCC::Report with a lock operation, the current value for Door Lock CC should be updated accordingly",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/notificationAndDoorLockCC",
		),

		testBody: async (t, driver, node, mockController, mockNode) => {
			const valueId = DoorLockCCValues.currentMode.id;

			let cc = new NotificationCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				notificationType: 0x06, // Access Control,
				notificationEvent: 0x01, // Manual Lock Operation
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			// wait a bit for the value to be updated
			await wait(100);

			t.is(node.getValue(valueId), DoorLockMode.Secured);

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

			t.is(node.getValue(valueId), DoorLockMode.Unsecured);
		},
	},
);
