import { BasicCCValues } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"A Thermostat with compat flag mapBasicReport=false exposes currentValue",
	{
		// debug: true,

		nodeCapabilities: {
			manufacturerId: 0xdead,
			productType: 0xbeef,
			productId: 0xcafe,

			// General Thermostat V2
			genericDeviceClass: 0x08,
			specificDeviceClass: 0x06,
			commandClasses: [
				CommandClasses["Z-Wave Plus Info"],
				// CommandClasses["Multilevel Sensor"],
				CommandClasses["Version"],
				{
					ccId: CommandClasses["Thermostat Setpoint"],
					version: 3,
				},
				{
					ccId: CommandClasses["Thermostat Mode"],
					version: 3,
				},
				CommandClasses["Manufacturer Specific"],
				// CommandClasses["Meter"],
				{
					ccId: CommandClasses.Basic,
					version: 1,
				},
			],
		},

		additionalDriverOptions: {
			storage: {
				deviceConfigPriorityDir: path.join(
					__dirname,
					"fixtures/mapBasicReportFalse",
				),
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			// Despite the compat flag, Basic CC should not be considered supported
			t.false(node.supportsCC(CommandClasses.Basic));

			// But currentValue should be exposed - otherwise it makes no sense to not map it
			const valueIDs = node.getDefinedValueIDs();
			t.true(
				valueIDs.some((v) => BasicCCValues.currentValue.is(v)),
				"Did not find Basic CC currentValue although it should be exposed",
			);
			t.false(
				valueIDs.some((v) => BasicCCValues.targetValue.is(v)),
				"Found Basic CC targetValue although it shouldn't be exposed",
			);
		},
	},
);
