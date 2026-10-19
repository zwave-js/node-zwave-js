// @ts-check
// Tests Binary Switch CC v1 with Version CC v1 (intentional variation).
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 20,
			capabilities: {
				commandClasses: [
					{
						ccId: CommandClasses.Version,
						version: 1,
					},
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Bin Switch V1+V1",
					}),
					ccCaps({
						ccId: CommandClasses["Binary Switch"],
						version: 1,
					}),
				],
			},
		},
	],
};
