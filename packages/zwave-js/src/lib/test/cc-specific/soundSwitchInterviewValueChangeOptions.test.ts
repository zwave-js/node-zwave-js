import { SoundSwitchCCValues } from "@zwave-js/cc/SoundSwitchCC";
import { CommandClasses } from "@zwave-js/core";
import { ccCaps } from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"The toneId value should have value change options after SoundSwitchCC interview",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				ccCaps({
					ccId: CommandClasses["Sound Switch"],
					isSupported: true,
					defaultToneId: 1,
					defaultVolume: 0,
					tones: [
						{
							duration: 20,
							name: `Test Tone 1`,
						},
					],
				}),
			],
		},

		testBody: async (t, driver, node, _mockController, _mockNode) => {
			const toneIdValue = SoundSwitchCCValues.toneId;
			const meta = node.getValueMetadata(toneIdValue.id);
			t.expect(meta.valueChangeOptions).toStrictEqual(["volume"]);
		},
	},
);
