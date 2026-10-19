// @ts-check
// Tests slow single-channel device with Supervision.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { SwitchType } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 67,
			capabilities: {
				genericDeviceClass: 0x11,
				specificDeviceClass: 0x05,
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Slow Single Sup",
					}),
					{
						ccId: CommandClasses.Supervision,
						version: 2,
					},
					ccCaps({
						ccId: CommandClasses["Multilevel Switch"],
						version: 4,
						primarySwitchType: SwitchType["Down/Up"],
						defaultValue: 0,
					}),
				],
			},
		},
	],
};
