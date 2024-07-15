import {
	BinarySensorCCGet,
	BinarySensorCCReport,
	BinarySensorCCValues,
	BinarySensorType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { type MockNodeBehavior, ccCaps } from "@zwave-js/testing";
import { defaultCapabilities } from "../../node/mockCCBehaviors/UserCode";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"When a node sends a Binary Sensor Report with type 0xFF (Any), use the first supported sensor instead",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				ccCaps({
					ccId: CommandClasses["Binary Sensor"],
					isSupported: true,
					version: 2,
					supportedSensorTypes: [BinarySensorType.Motion],
				}),
			],
		},

		customSetup: async (driver, mockController, mockNode) => {
			const respondToBinarySensorGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof BinarySensorCCGet) {
						const capabilities = {
							...defaultCapabilities,
							...self.getCCCapabilities(
								CommandClasses["Binary Sensor"],
								receivedCC.endpointIndex,
							),
						};

						// Incorrectly respond with 0xFF as the sensor type
						const cc = new BinarySensorCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							type: BinarySensorType.Any,
							value: true,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToBinarySensorGet);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			// Even though the node reports a sensor type of 0xFF (Any),
			// there should be no value for the type Any, and only one for type Motion
			const anyValue = node.getValue(
				BinarySensorCCValues.state(BinarySensorType.Any).id,
			);
			t.is(anyValue, undefined);

			const motionValue = node.getValue(
				BinarySensorCCValues.state(BinarySensorType.Motion).id,
			);
			t.is(motionValue, true);
		},
	},
);
