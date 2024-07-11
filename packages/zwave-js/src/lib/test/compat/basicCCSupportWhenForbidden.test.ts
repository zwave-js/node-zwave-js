import { BasicCCValues } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"On devices that MUST not support Basic CC, and treat Basic Set as a report, ONLY currentValue should be exposed",
	{
		// debug: true,

		nodeCapabilities: {
			manufacturerId: 0xdead,
			productType: 0xbeef,
			productId: 0xcafe,

			// Routing Multilevel Sensor, MUST not support Basic CC
			genericDeviceClass: 0x21,
			specificDeviceClass: 0x01,
			commandClasses: [
				CommandClasses["Manufacturer Specific"],
				CommandClasses.Version,
				// But it reports support if asked
				CommandClasses.Basic,
			],
		},

		additionalDriverOptions: {
			storage: {
				deviceConfigPriorityDir: path.join(
					__dirname,
					"fixtures/mapBasicSetReport",
				),
			},
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

integrationTest(
	"On devices that MUST not support Basic CC, and map Basic Set to a different CC, NO Basic CC values should be exposed",
	{
		// debug: true,

		nodeCapabilities: {
			manufacturerId: 0xdead,
			productType: 0xbeef,
			productId: 0xcafe,

			// Routing Multilevel Sensor, MUST not support Basic CC
			genericDeviceClass: 0x21,
			specificDeviceClass: 0x01,
			commandClasses: [
				CommandClasses["Manufacturer Specific"],
				CommandClasses.Version,
				// But it reports support if asked
				CommandClasses.Basic,
			],
		},

		additionalDriverOptions: {
			storage: {
				deviceConfigPriorityDir: path.join(
					__dirname,
					"fixtures/mapBasicSetBinarySensor",
				),
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const valueIDs = node.getDefinedValueIDs();
			t.false(
				valueIDs.some((v) => BasicCCValues.currentValue.is(v)),
				"Found Basic CC currentValue although it shouldn't be exposed",
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
