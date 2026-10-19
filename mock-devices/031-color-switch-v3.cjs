// @ts-check
// Tests Color Switch CC v3 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { ColorComponent } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 31,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Color Switch V3",
					}),
					ccCaps({
						ccId: CommandClasses["Color Switch"],
						version: 3,
						colorComponents: {
							[ColorComponent.Red]: 0,
							[ColorComponent.Green]: 0,
							[ColorComponent.Blue]: 0,
						},
					}),
				],
			},
		},
	],
};
