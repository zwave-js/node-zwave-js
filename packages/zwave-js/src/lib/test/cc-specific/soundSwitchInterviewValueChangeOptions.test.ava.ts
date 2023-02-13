import {
	SoundSwitchCCConfigurationGet,
	SoundSwitchCCConfigurationReport,
	SoundSwitchCCToneInfoGet,
	SoundSwitchCCToneInfoReport,
	SoundSwitchCCTonesNumberGet,
	SoundSwitchCCTonesNumberReport,
	SoundSwitchCCValues,
} from "@zwave-js/cc/SoundSwitchCC";
import { CommandClasses } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockZWaveFrameType,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"The toneId value should have value change options after SoundSwitchCC interview",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [CommandClasses["Sound Switch"]],
		},

		customSetup: async (driver, controller, mockNode) => {
			const respondToSoundSwitchConfigurationGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof SoundSwitchCCConfigurationGet
					) {
						const cc = new SoundSwitchCCConfigurationReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								defaultToneId: 1,
								defaultVolume: 0,
							},
						);
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
			mockNode.defineBehavior(respondToSoundSwitchConfigurationGet);

			const respondToSoundSwitchToneNumberGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof SoundSwitchCCTonesNumberGet
					) {
						const cc = new SoundSwitchCCTonesNumberReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								toneCount: 1,
							},
						);
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
			mockNode.defineBehavior(respondToSoundSwitchToneNumberGet);

			const respondToSoundSwitchToneInfoGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof SoundSwitchCCToneInfoGet
					) {
						const cc = new SoundSwitchCCToneInfoReport(self.host, {
							nodeId: controller.host.ownNodeId,
							toneId: frame.payload.toneId,
							duration: 20,
							name: `Test Tone ${frame.payload.toneId}`,
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
			mockNode.defineBehavior(respondToSoundSwitchToneInfoGet);
		},

		testBody: async (t, driver, node, _mockController, _mockNode) => {
			const toneIdValue = SoundSwitchCCValues.toneId;
			const meta = node.getValueMetadata(toneIdValue.id);
			t.deepEqual(meta.valueChangeOptions, ["volume"]);
		},
	},
);
