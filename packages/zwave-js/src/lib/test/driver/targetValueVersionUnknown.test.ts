import {
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCValues,
	VersionCCCommandClassGet,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite";

// Repro for https://github.com/zwave-js/node-zwave-js/issues/6048

integrationTest(
	`targetValue properties are exposed for CCs where the version could not be queried`,
	{
		debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Binary Switch"],
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Do not respond to CC version queries
			const noResponseToVersionCommandClassGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof VersionCCCommandClassGet
					) {
						return true;
					}
					return false;
				},
			};
			mockNode.defineBehavior(noResponseToVersionCommandClassGet);

			// Respond to binary switch state
			const respondToBinarySwitchGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof BinarySwitchCCGet
					) {
						const cc = new BinarySwitchCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							currentValue: true,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);
						return true;
					}
					return false;
				},
			};
			mockNode.defineBehavior(respondToBinarySwitchGet);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const defined = node.getDefinedValueIDs();
			const targetValue = BinarySwitchCCValues.targetValue;
			const existing = defined.find((v) => targetValue.is(v));
			t.not(existing, undefined, "targetValue should be defined");
		},
	},
);
