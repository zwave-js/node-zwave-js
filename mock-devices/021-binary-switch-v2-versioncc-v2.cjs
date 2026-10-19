// @ts-check
// Tests Binary Switch CC v2 with Version CC v2 (intentional variation).
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 21,
			capabilities: {
				commandClasses: [
					{
						ccId: CommandClasses.Version,
						version: 2,
					},
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Bin Switch V2+V2",
					}),
					ccCaps({
						ccId: CommandClasses["Binary Switch"],
						version: 2,
					}),
				],
			},
		},
	],
};
