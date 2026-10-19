// @ts-check
// Tests Indicator CC v2 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 51,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Indicator V2",
					}),
					ccCaps({
						ccId: CommandClasses.Indicator,
						version: 2,
						indicators: {
							1: { properties: [1] },
						},
					}),
				],
			},
		},
	],
};
