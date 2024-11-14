// @ts-check
const { CommandClasses, ConfigValueFormat, SupervisionStatus } = require(
	"@zwave-js/core",
);
const { ccCaps, MockZWaveFrameType, createMockZWaveRequestFrame } = require(
	"@zwave-js/testing",
);
const { wait } = require("alcalzone-shared/async");
const {
	SupervisionCCGet,
	SupervisionCCReport,
	ConfigurationCCSet,
	SwitchType,
} = require(
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
					// CommandClasses.Supervision,
					ccCaps({
						ccId: CommandClasses["Multilevel Switch"],
						isSupported: true,
						version: 4,
						defaultValue: 0,
						primarySwitchType: SwitchType["Down/Up"],
					}),
				],
			},
			// behaviors: [
			// 	{
			// 		async handleCC(controller, self, receivedCC) {
			// 			if (
			// 				receivedCC instanceof SupervisionCCGet
			// 				&& receivedCC.encapsulated
			// 					instanceof ConfigurationCCSet
			// 			) {
			// 				const cc = new SupervisionCCReport({
			// 					nodeId: controller.ownNodeId,
			// 					sessionId: receivedCC.sessionId,
			// 					moreUpdatesFollow: false,
			// 					status: SupervisionStatus.Fail,
			// 				});

			// 				return { action: "sendCC", cc };
			// 			}
			// 		},
			// 	},
			// ],
		},
	],
};
