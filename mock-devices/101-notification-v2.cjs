// @ts-check
// Tests Notification CC v2 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 101,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Notification V2",
					}),
					ccCaps({
						ccId: CommandClasses.Notification,
						version: 2,
						supportsV1Alarm: false,
						notificationTypesAndEvents: { 1: [1] },
					}),
				],
			},
		},
	],
};
