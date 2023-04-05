import { CommandClasses } from "@zwave-js/core";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"The version of endpoint-only CCs gets queried during the interview",
	{
		// debug: true,

		nodeCapabilities: {
			isListening: true,
			isFrequentListening: false,

			commandClasses: [
				{
					ccId: CommandClasses.Version,
					version: 1,
					isSupported: true,
				},
				{
					ccId: CommandClasses["Multi Channel"],
					version: 2,
					isSupported: true,
				},
			],
			endpoints: [
				// Two identical endpoints
				{
					// Binary Power Switch
					genericDeviceClass: 0x10,
					specificDeviceClass: 0x01,
					// Does not support the Version CC, but supports Binary Switch CC V2
					commandClasses: [
						{
							ccId: CommandClasses["Binary Switch"],
							version: 2,
							isSupported: true,
						},
					],
				},
				{
					// Binary Power Switch
					genericDeviceClass: 0x10,
					specificDeviceClass: 0x01,
					// Does not support the Version CC, but supports Binary Switch CC V2
					commandClasses: [
						{
							ccId: CommandClasses["Binary Switch"],
							version: 2,
							isSupported: true,
						},
					],
				},
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.is(
				node
					.getEndpoint(1)
					?.getCCVersion(CommandClasses["Binary Switch"]),
				2,
			);
			t.is(
				node
					.getEndpoint(2)
					?.getCCVersion(CommandClasses["Binary Switch"]),
				2,
			);
		},
	},
);
