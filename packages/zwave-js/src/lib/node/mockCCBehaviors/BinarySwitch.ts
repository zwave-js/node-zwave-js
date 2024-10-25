import {
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCSet,
} from "@zwave-js/cc/BinarySwitchCC";
import {
	CommandClasses,
	type MaybeUnknown,
	UNKNOWN_STATE,
} from "@zwave-js/core";
import {
	type BinarySwitchCCCapabilities,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const defaultCapabilities: BinarySwitchCCCapabilities = {
	defaultValue: false,
};

const STATE_KEY_PREFIX = "BinarySwitch_";
const StateKeys = {
	currentValue: `${STATE_KEY_PREFIX}currentValue`,
} as const;

const respondToBinarySwitchGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof BinarySwitchCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Binary Switch"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new BinarySwitchCCReport({
				nodeId: controller.ownNodeId,
				currentValue: (
					self.state.get(StateKeys.currentValue)
						?? capabilities.defaultValue
						?? UNKNOWN_STATE
				) as MaybeUnknown<boolean>,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToBinarySwitchSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof BinarySwitchCCSet) {
			self.state.set(StateKeys.currentValue, receivedCC.targetValue);
			return { action: "ok" };
		}
	},
};

export const BinarySwitchCCBehaviors = [
	respondToBinarySwitchGet,
	respondToBinarySwitchSet,
];
