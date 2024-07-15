import {
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCValues,
	VersionCCCommandClassGet,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { type MockNodeBehavior } from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	`targetValue properties are exposed for CCs where the version could not be queried`,
	{
		// Repro for https://github.com/zwave-js/node-zwave-js/issues/6048

		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Binary Switch"],
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Do not respond to CC version queries
			const noResponseToVersionCommandClassGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof VersionCCCommandClassGet) {
						return { action: "stop" };
					}
				},
			};
			mockNode.defineBehavior(noResponseToVersionCommandClassGet);

			// Respond to binary switch state
			const respondToBinarySwitchGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof BinarySwitchCCGet) {
						const cc = new BinarySwitchCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							currentValue: true,
						});
						return { action: "sendCC", cc };
					}
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

integrationTest(
	`targetValue properties are exposed for CCs if Version CC is not supported`,
	{
		// Repro for https://github.com/zwave-js/node-zwave-js/issues/6119

		// debug: true,

		nodeCapabilities: {
			commandClasses: [CommandClasses["Binary Switch"]],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Respond to binary switch state
			const respondToBinarySwitchGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof BinarySwitchCCGet) {
						const cc = new BinarySwitchCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							currentValue: true,
						});
						return { action: "sendCC", cc };
					}
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
