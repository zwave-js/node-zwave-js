// @ts-check
// Tests Notification CC v3 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 102,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Notification V3",
					}),
					ccCaps({
						ccId: CommandClasses.Notification,
						version: 3,
						supportsV1Alarm: false,
						notificationTypesAndEvents: { 1: [1] },
					}),
				],
			},
		},
	],
};
