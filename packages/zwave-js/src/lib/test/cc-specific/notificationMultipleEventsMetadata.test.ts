import { NotificationCCValues } from "@zwave-js/cc/NotificationCC";
import { CommandClasses, type ValueMetadataNumeric } from "@zwave-js/core";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Notification types with multiple supported events preserve states for all of them",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses.Notification,
					isSupported: true,
					version: 8,
					supportsV1Alarm: false,
					notificationTypesAndEvents: {
						// Smoke Alarm - Smoke alarm test, Alarm silenced (and idle)
						[0x01]: [0x03, 0x06],
					},
				},
			],
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
