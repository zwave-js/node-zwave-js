// @ts-check
// Tests Multilevel Sensor CC v4 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 81,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Multilevel Sen4",
					}),
					ccCaps({
						ccId: CommandClasses["Multilevel Sensor"],
						version: 4,
						sensors: {
							1: { supportedScales: [0] },
						},
					}),
				],
			},
		},
	],
};
