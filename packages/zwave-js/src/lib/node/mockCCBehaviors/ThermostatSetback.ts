import { type SetbackState, SetbackType } from "@zwave-js/cc";
import {
	ThermostatSetbackCCGet,
	ThermostatSetbackCCReport,
	ThermostatSetbackCCSet,
} from "@zwave-js/cc/ThermostatSetbackCC";
import { type MockNodeBehavior } from "@zwave-js/testing";

const STATE_KEY_PREFIX = "ThermostatSetback_";
const StateKeys = {
	setbackType: `${STATE_KEY_PREFIX}setbackType`,
	setbackState: `${STATE_KEY_PREFIX}setbackState`,
} as const;

const respondToThermostatSetbackSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatSetbackCCSet) {
			self.state.set(StateKeys.setbackType, receivedCC.setbackType);
			self.state.set(StateKeys.setbackState, receivedCC.setbackState);
			return { action: "ok" };
		}
	},
};

const respondToThermostatSetbackGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatSetbackCCGet) {
			const setbackType = (
				self.state.get(StateKeys.setbackType)
					?? SetbackType.None
			) as SetbackType;
			const setbackState = (
				self.state.get(StateKeys.setbackState)
					?? "Unused"
			) as SetbackState;

			const cc = new ThermostatSetbackCCReport({
				nodeId: controller.ownNodeId,
				setbackType,
				setbackState,
			});
			return { action: "sendCC", cc };
		}
	},
};

export const ThermostatSetbackCCBehaviors = [
	respondToThermostatSetbackGet,
	respondToThermostatSetbackSet,
];
