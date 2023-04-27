// @ts-check
const { CommandClasses } = require("@zwave-js/core");
const { ccCaps } = require("@zwave-js/testing");

module.exports.default = {
	nodes: [
		{
			id: 2,
			capabilities: {
				commandClasses: [
					CommandClasses.Version,
					ccCaps({
						ccId: CommandClasses["Window Covering"],
						isSupported: true,
						version: 1,
						supportedParameters: new Array(24)
							.fill(0)
							.map((_, i) => i),
					}),
				],
			},
		},
	],
};
