import {
	SoundSwitchCCConfigurationGet,
	SoundSwitchCCConfigurationReport,
	SoundSwitchCCConfigurationSet,
	SoundSwitchCCToneInfoGet,
	SoundSwitchCCToneInfoReport,
	SoundSwitchCCTonePlayGet,
	SoundSwitchCCTonePlayReport,
	SoundSwitchCCTonePlaySet,
	SoundSwitchCCTonesNumberGet,
	SoundSwitchCCTonesNumberReport,
} from "@zwave-js/cc/SoundSwitchCC";
import { CommandClasses } from "@zwave-js/core/safe";
import { type Timer, setTimer } from "@zwave-js/shared";
import {
	type MockNodeBehavior,
	type SoundSwitchCCCapabilities,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

const defaultCapabilities: SoundSwitchCCCapabilities = {
	defaultToneId: 1,
	defaultVolume: 0,
	tones: [],
};

interface SoundSwitchState {
	toneId: number;
	volume: number;
	timeout: Timer;
}

const STATE_KEY_PREFIX = "SoundSwitch_";
const StateKeys = {
	defaultToneId: `${STATE_KEY_PREFIX}defaultToneId`,
	defaultVolume: `${STATE_KEY_PREFIX}defaultVolume`,
	state: `${STATE_KEY_PREFIX}state`,
	lastNonZeroVolume: `${STATE_KEY_PREFIX}lastNonZeroVolume`,
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
			const cc = new SoundSwitchCCConfigurationReport({
				nodeId: controller.ownNodeId,
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
			const cc = new SoundSwitchCCTonesNumberReport({
				nodeId: controller.ownNodeId,
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
				const cc = new SoundSwitchCCToneInfoReport({
					nodeId: controller.ownNodeId,
					toneId: receivedCC.toneId,
					...tone,
				});
				return { action: "sendCC", cc };
			}
			return { action: "stop" };
		}
	},
};

const respondToSoundSwitchTonePlaySet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof SoundSwitchCCTonePlaySet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Sound Switch"],
					receivedCC.endpointIndex,
				),
			};

			const currentState = self.state.get(
				StateKeys.state,
			) as SoundSwitchState | undefined;

			if (receivedCC.toneId === 0) {
				if (currentState) {
					currentState.timeout.clear();
					self.state.delete(StateKeys.state);
				}

				// TODO: Send unsolicited report if not supervised

				return { action: "ok" };
			} else {
				const toneId = receivedCC.toneId === 0xff
					? capabilities.defaultToneId
					: receivedCC.toneId;
				const tone = capabilities.tones[toneId - 1];
				if (!tone) return { action: "fail" };

				const volume = (receivedCC.volume === 0
					? capabilities.defaultVolume
					: receivedCC.volume === 0xff
					? self.state.get(
						StateKeys.lastNonZeroVolume,
					) as (number | undefined)
					: receivedCC.volume) || capabilities.defaultVolume;

				// Stop "playing" the previous tone
				if (currentState) {
					currentState.timeout.clear();
					self.state.delete(StateKeys.state);
				}

				if (volume !== 0) {
					self.state.set(StateKeys.lastNonZeroVolume, volume);
				}

				const newState: SoundSwitchState = {
					toneId,
					volume,
					timeout: setTimer(async () => {
						self.state.delete(StateKeys.state);

						// Tell the controller that we're done playing
						const cc = new SoundSwitchCCTonePlayReport({
							nodeId: controller.ownNodeId,
							toneId: 0,
							volume: 0,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);
					}, tone.duration * 1000).unref(),
				};
				self.state.set(StateKeys.state, newState);

				// TODO: Send unsolicited report if not supervised
				return { action: "ok" };
			}
		}
	},
};

const respondToSoundSwitchTonePlayGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof SoundSwitchCCTonePlayGet) {
			const currentState = self.state.get(
				StateKeys.state,
			) as SoundSwitchState | undefined;

			const cc = new SoundSwitchCCTonePlayReport({
				nodeId: controller.ownNodeId,
				toneId: currentState?.toneId ?? 0,
				volume: currentState?.volume ?? 0,
			});

			return { action: "sendCC", cc };
		}
	},
};

export const SoundSwitchCCBehaviors = [
	respondToSoundSwitchConfigurationGet,
	respondToSoundSwitchConfigurationSet,
	respondToSoundSwitchToneNumberGet,
	respondToSoundSwitchToneInfoGet,
	respondToSoundSwitchTonePlaySet,
	respondToSoundSwitchTonePlayGet,
];
