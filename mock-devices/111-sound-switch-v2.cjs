// @ts-check
// Tests Sound Switch CC v2 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 111,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Sound Switch V2",
					}),
					ccCaps({
						ccId: CommandClasses["Sound Switch"],
						version: 2,
						defaultToneId: 1,
						defaultVolume: 50,
						tones: [{ name: "Tone 1", duration: 5 }],
					}),
				],
			},
		},
	],
};
