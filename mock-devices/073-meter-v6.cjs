// @ts-check
// Tests Meter CC v6 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { RateType } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 73,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Meter V6",
					}),
					ccCaps({
						ccId: CommandClasses.Meter,
						version: 6,
						meterType: 1,
						supportedScales: [0],
						supportedRateTypes: [RateType.Consumed],
						supportsReset: true,
					}),
				],
			},
		},
	],
};
