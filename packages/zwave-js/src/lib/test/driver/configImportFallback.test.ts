import { CommandClasses } from "@zwave-js/core";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"$imports from user-defined config files fall back to the internal DB",
	{
		// debug: true,

		provisioningDirectory: path.join(
			__dirname,
			"fixtures/configImportFallback",
		),

		additionalDriverOptions: {
			storage: {
				deviceConfigPriorityDir: path.join(
					__dirname,
					"fixtures/configImportFallback",
				),
			},
		},

		nodeCapabilities: {
			manufacturerId: 0xdead,
			productType: 0xbeef,
			productId: 0xcafe,

			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Manufacturer Specific"],
				CommandClasses.Configuration,
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const param1 = node.deviceConfig?.paramInformation?.get({
				parameter: 1,
			});
			t.is(param1?.label, "Param 1");
			t.is(param1!.options?.length, 2);
		},
	},
);
