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
	type MockNodeBehavior,
	type SoundSwitchCCCapabilities,
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
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof SoundSwitchCCConfigurationGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Sound Switch"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new SoundSwitchCCConfigurationReport(self.host, {
				nodeId: controller.host.ownNodeId,
				defaultToneId:
					(self.state.get(StateKeys.defaultToneId) as number)
						?? capabilities.defaultToneId,
				defaultVolume:
					(self.state.get(StateKeys.defaultVolume) as number)
						?? capabilities.defaultVolume,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToSoundSwitchConfigurationSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof SoundSwitchCCConfigurationSet) {
			self.state.set(
				StateKeys.defaultToneId,
				receivedCC.defaultToneId,
			);
			self.state.set(
				StateKeys.defaultVolume,
				receivedCC.defaultVolume,
			);
			return { action: "ok" };
		}
	},
};

const respondToSoundSwitchToneNumberGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof SoundSwitchCCTonesNumberGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Sound Switch"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new SoundSwitchCCTonesNumberReport(self.host, {
				nodeId: controller.host.ownNodeId,
				toneCount: capabilities.tones.length,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToSoundSwitchToneInfoGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof SoundSwitchCCToneInfoGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Sound Switch"],
					receivedCC.endpointIndex,
				),
			};
			const tone = capabilities.tones[receivedCC.toneId - 1];
			if (tone) {
				const cc = new SoundSwitchCCToneInfoReport(self.host, {
					nodeId: controller.host.ownNodeId,
					toneId: receivedCC.toneId,
					...tone,
				});
				return { action: "sendCC", cc };
			}
			return { action: "stop" };
		}
	},
};

export const SoundSwitchCCBehaviors = [
	respondToSoundSwitchConfigurationGet,
	respondToSoundSwitchConfigurationSet,
	respondToSoundSwitchToneNumberGet,
	respondToSoundSwitchToneInfoGet,
];
