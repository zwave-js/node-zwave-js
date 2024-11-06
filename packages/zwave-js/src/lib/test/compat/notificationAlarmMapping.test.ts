import {
	NotificationCCReport,
	NotificationCCValues,
} from "@zwave-js/cc/NotificationCC";
import { CommandClasses } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import sinon from "sinon";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"the alarmMapping compat flag works correctly (using the example Kwikset 910)",
	{
		// debug: true,

		nodeCapabilities: {
			manufacturerId: 0x90,
			productType: 0x01,
			productId: 0x01,

			commandClasses: [
				{
					ccId: CommandClasses.Notification,
					version: 1, // To make sure we rely on the compat flag
					isSupported: true,
				},
				CommandClasses["Manufacturer Specific"],
				CommandClasses.Version,
			],
		},

		async testBody(t, driver, node, mockController, mockNode) {
			// Send a report that should be mapped to notifications
			const cc = new NotificationCCReport({
				nodeId: 2,
				alarmType: 18,
				alarmLevel: 2,
			});

			const nodeNotification = sinon.spy();
			node.on("notification", nodeNotification);

			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(100);

			// The correct events should be emitted
			sinon.assert.calledOnce(nodeNotification);
			const event = nodeNotification.getCall(0).args[2];

			t.expect(event.type).toBe(0x06);
			t.expect(event.event).toBe(0x05);
			t.expect(event.parameters).toStrictEqual({
				userId: 2,
			});

			// And they should be known to be supported
			const supportedNotificationTypes: number[] | undefined = node
				.getValue(NotificationCCValues.supportedNotificationTypes.id);
			t.expect(supportedNotificationTypes?.includes(0x06)).toBe(true);

			const supportedAccessControlEvents: number[] | undefined = node
				.getValue(
					NotificationCCValues.supportedNotificationEvents(0x06).id,
				);
			t.expect(supportedAccessControlEvents?.includes(0x05)).toBe(true);
		},
	},
);
