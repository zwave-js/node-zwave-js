import {
	MultilevelSwitchCCGet,
	MultilevelSwitchCCReport,
	MultilevelSwitchCCSet,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { type MockNodeBehavior, MockZWaveFrameType } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { ApplicationUpdateRequestNodeInfoReceived } from "../../serialapi/application/ApplicationUpdateRequest";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"When a NIF is received for a node that does not send unsolicited reports, refresh actuator and sensor CCs",
	{
		// Repro for #6117

		// debug: true,
		// provisioningDirectory: path.join(__dirname, "fixtures/base_2_nodes"),

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses.Association,
				CommandClasses["Multilevel Switch"],
			],
		},

		customSetup: async (driver, mockController, mockNode) => {
			let lastBrightness = 88;
			let currentBrightness = 0;
			const respondToMultilevelSwitchSet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof MultilevelSwitchCCSet) {
						const targetValue = receivedCC.targetValue;
						if (targetValue === 255) {
							currentBrightness = lastBrightness;
						} else {
							currentBrightness = targetValue;
							if (currentBrightness > 0) {
								lastBrightness = currentBrightness;
							}
						}

						return { action: "ok" };
					}
				},
			};
			mockNode.defineBehavior(respondToMultilevelSwitchSet);

			// Report Multilevel Switch status
			const respondToMultilevelSwitchGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof MultilevelSwitchCCGet) {
						const cc = new MultilevelSwitchCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							targetValue: 88,
							currentValue: 88,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToMultilevelSwitchGet);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const nif = new ApplicationUpdateRequestNodeInfoReceived(
				mockController.host,
				{
					nodeInformation: {
						nodeId: node.id,
						basicDeviceClass:
							mockNode.capabilities.basicDeviceClass,
						genericDeviceClass:
							mockNode.capabilities.genericDeviceClass,
						specificDeviceClass:
							mockNode.capabilities.specificDeviceClass,
						supportedCCs: [...mockNode.implementedCCs.keys()],
					},
				},
			);
			await mockController.sendToHost(nif.serialize());

			await wait(100);

			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof MultilevelSwitchCCGet,
			);

			t.pass();
		},
	},
);
