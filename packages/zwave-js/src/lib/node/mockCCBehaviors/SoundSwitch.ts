import {
	SoundSwitchCCConfigurationGet,
	SoundSwitchCCConfigurationReport,
	SoundSwitchCCConfigurationSet,
	SoundSwitchCCToneInfoGet,
	SoundSwitchCCToneInfoReport,
	SoundSwitchCCTonesNumberGet,
	SoundSwitchCCTonesNumberReport,
} from "@zwave-js/cc/SoundSwitchCC";
import { CommandClasses } from "@zwave-js/core/safe";
import {
	createMockZWaveRequestFrame,
	MockZWaveFrameType,
	SoundSwitchCCCapabilities,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const defaultCapabilities: SoundSwitchCCCapabilities = {
	defaultToneId: 1,
	defaultVolume: 0,
	tones: [],
};

const STATE_KEY_PREFIX = "SoundSwitch_";
const StateKeys = {
	defaultToneId: `${STATE_KEY_PREFIX}defaultToneId`,
	defaultVolume: `${STATE_KEY_PREFIX}defaultVolume`,
} as const;

const respondToSoundSwitchConfigurationGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof SoundSwitchCCConfigurationGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Sound Switch"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new SoundSwitchCCConfigurationReport(self.host, {
				nodeId: controller.host.ownNodeId,
				defaultToneId:
					(self.state.get(StateKeys.defaultToneId) as number) ??
					capabilities.defaultToneId,
				defaultVolume:
					(self.state.get(StateKeys.defaultVolume) as number) ??
					capabilities.defaultVolume,
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

const respondToSoundSwitchConfigurationSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof SoundSwitchCCConfigurationSet
		) {
			self.state.set(
				StateKeys.defaultToneId,
				frame.payload.defaultToneId,
			);
			self.state.set(
				StateKeys.defaultVolume,
				frame.payload.defaultVolume,
			);

			return true;
		}
		return false;
	},
};

const respondToSoundSwitchToneNumberGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof SoundSwitchCCTonesNumberGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Sound Switch"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new SoundSwitchCCTonesNumberReport(self.host, {
				nodeId: controller.host.ownNodeId,
				toneCount: capabilities.tones.length,
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

const respondToSoundSwitchToneInfoGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof SoundSwitchCCToneInfoGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Sound Switch"],
					frame.payload.endpointIndex,
				),
			};
			const tone = capabilities.tones[frame.payload.toneId - 1];
			if (tone) {
				const cc = new SoundSwitchCCToneInfoReport(self.host, {
					nodeId: controller.host.ownNodeId,
					toneId: frame.payload.toneId,
					...tone,
				});
				await self.sendToController(
					createMockZWaveRequestFrame(cc, {
						ackRequested: false,
					}),
				);
				return true;
			}
		}
		return false;
	},
};

export const behaviors = [
	respondToSoundSwitchConfigurationGet,
	respondToSoundSwitchConfigurationSet,
	respondToSoundSwitchToneNumberGet,
	respondToSoundSwitchToneInfoGet,
];
