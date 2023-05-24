// @ts-check
const { CommandClasses, ConfigValueFormat } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

module.exports.default = {
	nodes: [
		{
			id: 2,
			capabilities: {
				commandClasses: [
					CommandClasses.Version,
					ccCaps({
						ccId: CommandClasses.Configuration,
						isSupported: true,
						version: 4,
						parameters: [
							{
								"#": 10,
								valueSize: 1,
								format: ConfigValueFormat.SignedInteger,
								minValue: -128,
								maxValue: 0,
								defaultValue: 0,
								name: "Test Param 1",
							},
							{
								"#": 255,
								valueSize: 1,
								format: ConfigValueFormat.BitField,
								minValue: new Set([]),
								maxValue: new Set([1, 4, 7]),
								defaultValue: new Set([1]),
								name: "Test Param 2",
								info: "This is a description",
							},
						],
					}),
				],
			},
		},
	],
};
