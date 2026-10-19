// @ts-check
// Tests Configuration CC v4 behavior with version-specific parameter ranges.
const { CommandClasses, ConfigValueFormat } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 42,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Configuration V4",
					}),
					ccCaps({
						ccId: CommandClasses.Configuration,
						version: 4,
						bulkSupport: false,
						parameters: [
							{
								"#": 1,
								valueSize: 1,
								format: ConfigValueFormat.SignedInteger,
								minValue: 1,
								maxValue: 255,
								defaultValue: 1,
								name: "Range 1-255",
								info: "1-byte range",
							},
							{
								"#": 2,
								valueSize: 2,
								format: ConfigValueFormat.SignedInteger,
								minValue: 256,
								maxValue: 65535,
								defaultValue: 256,
								name: "Range 256-65535",
								info: "2-byte range",
							},
							{
								"#": 3,
								valueSize: 1,
								format: ConfigValueFormat.SignedInteger,
								minValue: 0,
								maxValue: 99,
								defaultValue: 0,
								name: "Sequential 3",
								info: "Sequential parameter",
							},
							{
								"#": 4,
								valueSize: 1,
								format: ConfigValueFormat.SignedInteger,
								minValue: 0,
								maxValue: 99,
								defaultValue: 0,
								name: "Sequential 4",
								info: "Sequential parameter",
							},
							{
								"#": 5,
								valueSize: 1,
								format: ConfigValueFormat.SignedInteger,
								minValue: 0,
								maxValue: 99,
								defaultValue: 0,
								name: "Sequential 5",
								info: "Sequential parameter",
							},
						],
					}),
				],
			},
		},
	],
};
