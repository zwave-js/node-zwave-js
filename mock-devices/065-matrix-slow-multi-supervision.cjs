// @ts-check
// Tests slow multi-channel device with Supervision (identical endpoints).
// Interesting combination: Supervision + Multi Channel encapsulation (encapsulationAnswerAsAsked.test.ts).
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { SwitchType } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 65,
			capabilities: {
				genericDeviceClass: 0x11,
				specificDeviceClass: 0x05,
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Slow Multi Sup",
					}),
					{
						ccId: CommandClasses.Supervision,
						version: 2,
					},
					{
						ccId: CommandClasses["Multi Channel"],
						version: 4,
					},
					ccCaps({
						ccId: CommandClasses["Multilevel Switch"],
						version: 4,
						primarySwitchType: SwitchType["Down/Up"],
						defaultValue: 0,
					}),
				],
				endpoints: [
					{
						genericDeviceClass: 0x11,
						specificDeviceClass: 0x05,
						commandClasses: [
							ccCaps({
								ccId: CommandClasses["Multilevel Switch"],
								version: 4,
								primarySwitchType: SwitchType["Down/Up"],
								defaultValue: 0,
							}),
						],
					},
					{
						genericDeviceClass: 0x11,
						specificDeviceClass: 0x05,
						commandClasses: [
							ccCaps({
								ccId: CommandClasses["Multilevel Switch"],
								version: 4,
								primarySwitchType: SwitchType["Down/Up"],
								defaultValue: 0,
							}),
						],
					},
				],
			},
		},
	],
};
