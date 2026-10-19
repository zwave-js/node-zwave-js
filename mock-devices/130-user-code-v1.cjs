// @ts-check
// Tests User Code CC v1 behavior with Schedule Entry Lock v3.
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 130,
			capabilities: {
				commandClasses: [
					{ ccId: CommandClasses.Version, version: 3 },
					CommandClasses["Manufacturer Specific"],
					ccCaps({
						ccId: CommandClasses["Node Naming and Location"],
						name: "User Code V1",
					}),
					ccCaps({
						ccId: CommandClasses["User Code"],
						version: 1,
						numUsers: 5,
					}),
					ccCaps({
						ccId: CommandClasses["Schedule Entry Lock"],
						version: 3,
						numWeekDaySlots: 2,
						numYearDaySlots: 1,
						numDailyRepeatingSlots: 1,
					}),
				],
			},
		},
	],
};
