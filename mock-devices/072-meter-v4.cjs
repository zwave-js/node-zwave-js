// @ts-check
// Tests Meter CC v4 behavior.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");
const { RateType } = require("zwave-js");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 72,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "Meter V4",
					}),
					ccCaps({
						ccId: CommandClasses.Meter,
						version: 4,
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
