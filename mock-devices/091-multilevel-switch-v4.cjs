// @ts-check
// Tests Multilevel Switch CC v4 behavior on a fast device class.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { SwitchType } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 91,
			capabilities: {
				genericDeviceClass: 0x11,
				specificDeviceClass: 0x01,
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Multilevel Sw4",
					}),
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
