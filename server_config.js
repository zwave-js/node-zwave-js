// @ts-check
const { CommandClasses, ConfigValueFormat, SupervisionStatus } = require(
	"@zwave-js/core",
);
const { ccCaps, MockZWaveFrameType, createMockZWaveRequestFrame } = require(
	"@zwave-js/testing",
);
const { wait } = require("alcalzone-shared/async/index.js");
const { SupervisionCCGet, SupervisionCCReport, ConfigurationCCSet } = require(
	"zwave-js",
);

/** @type {import("zwave-js/Testing").MockServerOptions["config"]} */
module.exports.default = {
	nodes: [
		{
			id: 2,
			capabilities: {
				commandClasses: [
					CommandClasses.Version,
					CommandClasses.Supervision,
					ccCaps({
						ccId: CommandClasses.Configuration,
						isSupported: true,
						version: 4,
						parameters: [
							{
								"#": 10,
								valueSize: 1,
								format: ConfigValueFormat.SignedInteger,
								minValue: -128,
								maxValue: 0,
								defaultValue: 0,
								name: "Test Param 1",
							},
							{
								"#": 255,
								valueSize: 1,
								format: ConfigValueFormat.BitField,
								minValue: new Set([]),
								maxValue: new Set([1, 4, 7]),
								defaultValue: new Set([1]),
								name: "Test Param 2",
								info: "This is a description",
							},
						],
					}),
				],
			},
			behaviors: [
				{
					async handleCC(controller, self, receivedCC) {
						if (
							receivedCC instanceof SupervisionCCGet
							&& receivedCC.encapsulated
								instanceof ConfigurationCCSet
						) {
							const cc = new SupervisionCCReport({
								nodeId: controller.ownNodeId,
								sessionId: receivedCC.sessionId,
								moreUpdatesFollow: false,
								status: SupervisionStatus.Fail,
							});

							return { action: "sendCC", cc };
						}
					},
				},
			],
		},
	],
};
