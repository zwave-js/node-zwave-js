// @ts-check
// Tests combined Window Covering + Multilevel Switch CC support.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { SwitchType, WindowCoveringParameter } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 143,
			capabilities: {
				genericDeviceClass: 0x09,
				specificDeviceClass: 0x01,
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "WinCov + MultiSw",
					}),
					ccCaps({
						ccId: CommandClasses["Multilevel Switch"],
						version: 4,
						primarySwitchType: SwitchType["Down/Up"],
						defaultValue: 0,
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
