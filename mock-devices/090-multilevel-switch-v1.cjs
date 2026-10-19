// @ts-check
// Tests Multilevel Switch CC v1 behavior on a fast device class.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { SwitchType } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 90,
			capabilities: {
				genericDeviceClass: 0x11,
				specificDeviceClass: 0x01,
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Multilevel Sw1",
					}),
					ccCaps({
						ccId: CommandClasses["Multilevel Switch"],
						version: 1,
						primarySwitchType: SwitchType["Down/Up"],
						defaultValue: 0,
					}),
				],
			},
		},
	],
};
