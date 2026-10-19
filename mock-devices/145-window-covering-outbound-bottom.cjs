// @ts-check
// Tests Window Covering CC with outbound bottom position support.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { WindowCoveringParameter } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 145,
			capabilities: {
				genericDeviceClass: 0x09,
				specificDeviceClass: 0x01,
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "WinCov OutBot",
					}),
					ccCaps({
						ccId: CommandClasses["Window Covering"],
						version: 1,
						supportedParameters: [
							WindowCoveringParameter["Outbound Bottom"],
						],
					}),
				],
			},
		},
	],
};
