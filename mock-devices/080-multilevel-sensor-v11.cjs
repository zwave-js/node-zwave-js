// @ts-check
// Tests Multilevel Sensor CC v11 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 80,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Multilevel Sen11",
					}),
					ccCaps({
						ccId: CommandClasses["Multilevel Sensor"],
						version: 11,
						sensors: {
							1: { supportedScales: [0] },
						},
					}),
				],
			},
		},
	],
};
