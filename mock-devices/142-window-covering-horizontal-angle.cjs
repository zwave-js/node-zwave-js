// @ts-check
// Tests Window Covering CC with horizontal slats angle position support.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { WindowCoveringParameter } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 142,
			capabilities: {
				genericDeviceClass: 0x09,
				specificDeviceClass: 0x01,
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "WinCov Horiz Ang",
					}),
					ccCaps({
						ccId: CommandClasses["Window Covering"],
						version: 1,
						supportedParameters: [
							WindowCoveringParameter["Horizontal Slats Angle"],
						],
					}),
				],
			},
		},
	],
};
