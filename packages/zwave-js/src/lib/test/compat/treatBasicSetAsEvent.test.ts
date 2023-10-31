import { BasicCCValues } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Basic CC values should only include the compatEvent value if Basic CC is not supported, but the compat flag is set",
	{
		// debug: true,

		nodeCapabilities: {
			manufacturerId: 0xdead,
			productType: 0xbeef,
			productId: 0xcafe,

			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Manufacturer Specific"],
				// Basic CC is only controlled
				{
					ccId: CommandClasses.Basic,
					isSupported: false,
					isControlled: true,
					version: 1,
				},
			],
		},

		additionalDriverOptions: {
			storage: {
				deviceConfigPriorityDir: path.join(
					__dirname,
					"fixtures/basicEventNoSupport",
				),
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			// Make sure the custom config is loaded
			const treatBasicSetAsEvent = node.deviceConfig?.compat
				?.treatBasicSetAsEvent;
			t.is(treatBasicSetAsEvent, true);

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

			t.true(
				valueIDs.some((v) => BasicCCValues.compatEvent.is(v)),
				"Did not find Basic CC compatEvent although it should be exposed",
			);
		},
	},
);

integrationTest(
	"Basic CC values should only include the compatEvent value if Basic CC should be hidden in favor of another CC, but the compat flag is set",
	{
		// debug: true,

		nodeCapabilities: {
			manufacturerId: 0xdead,
			productType: 0xbeef,
			productId: 0xcafe,

			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Manufacturer Specific"],
				// Basic CC is supported, but should be hidden
				CommandClasses.Basic,
				CommandClasses["Binary Switch"],
			],
		},

		additionalDriverOptions: {
			storage: {
				deviceConfigPriorityDir: path.join(
					__dirname,
					"fixtures/basicEventNoSupport",
				),
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			// Make sure the custom config is loaded
			const treatBasicSetAsEvent = node.deviceConfig?.compat
				?.treatBasicSetAsEvent;
			t.is(treatBasicSetAsEvent, true);

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

			t.true(
				valueIDs.some((v) => BasicCCValues.compatEvent.is(v)),
				"Did not find Basic CC compatEvent although it should be exposed",
			);
		},
	},
);

integrationTest(
	"Basic CC values should NOT include the compatEvent value if Basic CC is supported, and the compat flag is not set",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses.Basic,
				// No other actuator CC is supported
			],
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const valueIDs = node.getDefinedValueIDs();
			t.true(
				valueIDs.some((v) => BasicCCValues.currentValue.is(v)),
				"Did not find Basic CC currentValue although it should be exposed",
			);
			t.true(
				valueIDs.some((v) => BasicCCValues.targetValue.is(v)),
				"Did not find Basic CC targetValue although it should be exposed",
			);
			t.true(
				valueIDs.some((v) => BasicCCValues.duration.is(v)),
				"Did not find Basic CC duration although it should be exposed",
			);
			t.true(
				valueIDs.some((v) => BasicCCValues.restorePrevious.is(v)),
				"Did not find Basic CC restorePrevious although it should be exposed",
			);

			t.false(
				valueIDs.some((v) => BasicCCValues.compatEvent.is(v)),
				"Found Basic CC compatEvent although it shouldn't be exposed",
			);
		},
	},
);
