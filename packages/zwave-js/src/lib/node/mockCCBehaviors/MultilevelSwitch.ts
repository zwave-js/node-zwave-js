import { SwitchType } from "@zwave-js/cc";
import {
	MultilevelSwitchCCGet,
	MultilevelSwitchCCReport,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCStartLevelChange,
	MultilevelSwitchCCStopLevelChange,
	MultilevelSwitchCCSupportedGet,
	MultilevelSwitchCCSupportedReport,
} from "@zwave-js/cc/MultilevelSwitchCC";
import {
	CommandClasses,
	type MaybeUnknown,
	UNKNOWN_STATE,
} from "@zwave-js/core";
import {
	type MockNodeBehavior,
	type MultilevelSwitchCCCapabilities,
} from "@zwave-js/testing";

const defaultCapabilities: MultilevelSwitchCCCapabilities = {
	defaultValue: 0,
	primarySwitchType: SwitchType["Down/Up"],
};

const STATE_KEY_PREFIX = "MultilevelSwitch_";
const StateKeys = {
	currentValue: `${STATE_KEY_PREFIX}currentValue`,
} as const;

const respondToMultilevelSwitchGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSwitchCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Switch"],
					receivedCC.endpointIndex,
				),
			};
			const currentValue = (
				self.state.get(StateKeys.currentValue)
					?? capabilities.defaultValue
					?? UNKNOWN_STATE
			) as MaybeUnknown<number>;
			const cc = new MultilevelSwitchCCReport({
				nodeId: controller.ownNodeId,
				currentValue,
				// We don't support transitioning yet
				targetValue: currentValue,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMultilevelSwitchSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSwitchCCSet) {
			self.state.set(StateKeys.currentValue, receivedCC.targetValue);
			return { action: "ok" };
		}
	},
};

const respondToMultilevelSwitchSupportedGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSwitchCCSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Switch"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new MultilevelSwitchCCSupportedReport({
				nodeId: controller.ownNodeId,
				switchType: capabilities.primarySwitchType,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMultilevelSwitchStartLevelChange: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSwitchCCStartLevelChange) {
			// TODO: A proper simulation should gradually transition the value. We just set it to the target value.
			self.state.set(
				StateKeys.currentValue,
				receivedCC.direction === "up" ? 99 : 0,
			);

			return { action: "ok" };
		}
	},
};

const respondToMultilevelSwitchStopLevelChange: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSwitchCCStopLevelChange) {
			return { action: "ok" };
		}
	},
};

export const MultilevelSwitchCCBehaviors = [
	respondToMultilevelSwitchGet,
	respondToMultilevelSwitchSet,
	respondToMultilevelSwitchSupportedGet,
	respondToMultilevelSwitchStartLevelChange,
	respondToMultilevelSwitchStopLevelChange,
];
