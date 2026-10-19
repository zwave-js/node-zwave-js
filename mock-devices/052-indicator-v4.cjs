// @ts-check
// Tests Indicator CC v4 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 52,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Indicator V4",
					}),
					ccCaps({
						ccId: CommandClasses.Indicator,
						version: 4,
						indicators: {
							0x80: {
								properties: [1],
								manufacturerSpecificDescription:
									"Mock indicator 0x80",
							},
						},
					}),
				],
			},
		},
	],
};
