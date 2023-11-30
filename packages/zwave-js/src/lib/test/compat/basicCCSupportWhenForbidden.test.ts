import { BasicCCValues } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"On devices that MUST not support Basic CC, but use Basic Set to report status, ONLY currentValue should be exposed",
	{
		debug: true,

		nodeCapabilities: {
			// Routing Multilevel Sensor, MUST not support Basic CC
			genericDeviceClass: 0x21,
			specificDeviceClass: 0x01,
			commandClasses: [
				CommandClasses.Version,
				// But it reports support if asked
				CommandClasses.Basic,
			],
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const valueIDs = node.getDefinedValueIDs();
			t.true(
				valueIDs.some((v) => BasicCCValues.currentValue.is(v)),
				"Did not find Basic CC currentValue although it should be exposed",
			);
			t.false(
				valueIDs.some((v) => BasicCCValues.targetValue.is(v)),
				"Found Basic CC targetValue although it shouldn't be exposed",
			);
			t.false(
				valueIDs.some((v) => BasicCCValues.duration.is(v)),
				"Found Basic CC duration although it shouldn't be exposed",
			);
			t.false(
				valueIDs.some((v) => BasicCCValues.restorePrevious.is(v)),
				"Found Basic CC restorePrevious although it shouldn't be exposed",
			);

			t.false(
				valueIDs.some((v) => BasicCCValues.compatEvent.is(v)),
				"Found Basic CC compatEvent although it shouldn't be exposed",
			);
		},
	},
);
