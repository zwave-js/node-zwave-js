// @ts-check
// Tests Binary Sensor CC v1 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 10,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Binary Sensor V1",
					}),
					ccCaps({
						ccId: CommandClasses["Binary Sensor"],
						version: 1,
						supportedSensorTypes: [1],
					}),
				],
			},
		},
	],
};
