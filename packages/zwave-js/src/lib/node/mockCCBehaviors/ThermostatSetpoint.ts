import { ThermostatSetpointType } from "@zwave-js/cc";
import {
	ThermostatSetpointCCCapabilitiesGet,
	ThermostatSetpointCCCapabilitiesReport,
	ThermostatSetpointCCGet,
	ThermostatSetpointCCReport,
	ThermostatSetpointCCSet,
	ThermostatSetpointCCSupportedGet,
	ThermostatSetpointCCSupportedReport,
} from "@zwave-js/cc/ThermostatSetpointCC";
import { CommandClasses } from "@zwave-js/core/safe";
import {
	type MockNodeBehavior,
	type ThermostatSetpointCCCapabilities,
} from "@zwave-js/testing";

const defaultCapabilities: ThermostatSetpointCCCapabilities = {
	setpoints: {
		[ThermostatSetpointType.Heating]: {
			minValue: 0,
			maxValue: 100,
			scale: "°C",
		},
	},
};

const STATE_KEY_PREFIX = "ThermostatSetpoint_";
const StateKeys = {
	setpoint: (type: ThermostatSetpointType) =>
		`${STATE_KEY_PREFIX}setpoint_${type}`,
	scale: (type: ThermostatSetpointType) => `${STATE_KEY_PREFIX}scale_${type}`,
} as const;

const respondToThermostatSetpointSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatSetpointCCSet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					receivedCC.endpointIndex,
				),
			};
			const setpointCaps =
				capabilities.setpoints[receivedCC.setpointType];
			if (!setpointCaps) return { action: "fail" };

			const value = receivedCC.value;
			if (
				value > setpointCaps.minValue
				|| value > setpointCaps.maxValue
			) {
				return { action: "fail" };
			}

			self.state.set(
				StateKeys.setpoint(receivedCC.setpointType),
				value,
			);
			self.state.set(
				StateKeys.scale(receivedCC.setpointType),
				receivedCC.scale,
			);
			return { action: "ok" };
		}
	},
};

const respondToThermostatSetpointGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatSetpointCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					receivedCC.endpointIndex,
				),
			};

			const setpointType = receivedCC.setpointType;

			const setpointCaps = capabilities.setpoints[setpointType];

			let value = self.state.get(StateKeys.setpoint(setpointType)) as
				| number
				| undefined;
			let scale = self.state.get(StateKeys.scale(setpointType)) as
				| number
				| undefined;
			if (setpointCaps) {
				if (value === undefined) {
					value = setpointCaps.defaultValue ?? setpointCaps.minValue;
				}
				if (scale === undefined) {
					scale = setpointCaps.scale === "°F" ? 1 : 0;
				}
			}

			let cc: ThermostatSetpointCCReport;
			if (value !== undefined) {
				cc = new ThermostatSetpointCCReport(self.host, {
					nodeId: controller.host.ownNodeId,
					type: setpointType,
					value,
					scale: scale ?? 0,
				});
			} else {
				cc = new ThermostatSetpointCCReport(self.host, {
					nodeId: controller.host.ownNodeId,
					type: ThermostatSetpointType["N/A"],
					scale: 0,
					value: 0,
				});
			}
			return { action: "sendCC", cc };
		}
	},
};

const respondToThermostatSetpointSupportedGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatSetpointCCSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					receivedCC.endpointIndex,
				),
			};

			const cc = new ThermostatSetpointCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedSetpointTypes: Object.keys(capabilities.setpoints).map(
					(k) => parseInt(k),
				),
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToThermostatSetpointCapabilitiesGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatSetpointCCCapabilitiesGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					receivedCC.endpointIndex,
				),
			};

			const setpointType = receivedCC.setpointType;
			const setpointCaps = capabilities.setpoints[setpointType];

			let cc: ThermostatSetpointCCCapabilitiesReport;
			if (setpointCaps) {
				cc = new ThermostatSetpointCCCapabilitiesReport(self.host, {
					nodeId: controller.host.ownNodeId,
					type: setpointType,
					minValue: setpointCaps.minValue,
					maxValue: setpointCaps.maxValue,
					minValueScale: setpointCaps.scale === "°C" ? 0 : 1,
					maxValueScale: setpointCaps.scale === "°C" ? 0 : 1,
				});
			} else {
				cc = new ThermostatSetpointCCCapabilitiesReport(self.host, {
					nodeId: controller.host.ownNodeId,
					type: ThermostatSetpointType["N/A"],
					minValue: 0,
					maxValue: 0,
					minValueScale: 0,
					maxValueScale: 0,
				});
			}
			return { action: "sendCC", cc };
		}
	},
};

export const ThermostatSetpointCCBehaviors = [
	respondToThermostatSetpointGet,
	respondToThermostatSetpointSet,
	respondToThermostatSetpointSupportedGet,
	respondToThermostatSetpointCapabilitiesGet,
];
