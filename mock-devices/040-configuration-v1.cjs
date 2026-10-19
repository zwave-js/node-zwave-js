// @ts-check
// Tests Configuration CC v1 behavior with a simple parameter.
const { CommandClasses, ConfigValueFormat } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 40,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Configuration V1",
					}),
					ccCaps({
						ccId: CommandClasses.Configuration,
						version: 1,
						bulkSupport: false,
						parameters: [
							{
								"#": 1,
								valueSize: 1,
								format: ConfigValueFormat.SignedInteger,
								minValue: 0,
								maxValue: 99,
								defaultValue: 0,
								name: "Test Param",
								info: "Simple range parameter",
							},
						],
					}),
				],
			},
		},
	],
};
