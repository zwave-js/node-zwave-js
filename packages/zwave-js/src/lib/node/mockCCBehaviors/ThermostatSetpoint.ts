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
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
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
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ThermostatSetpointCCSet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					frame.payload.endpointIndex,
				),
			};
			const setpointCaps =
				capabilities.setpoints[frame.payload.setpointType];
			if (!setpointCaps) return true;

			const value = frame.payload.value;
			if (
				value > setpointCaps.minValue ||
				value > setpointCaps.maxValue
			) {
				return true;
			}

			self.state.set(
				StateKeys.setpoint(frame.payload.setpointType),
				value,
			);
			self.state.set(
				StateKeys.scale(frame.payload.setpointType),
				frame.payload.scale,
			);
			return true;
		}
		return false;
	},
};

const respondToThermostatSetpointGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ThermostatSetpointCCGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					frame.payload.endpointIndex,
				),
			};

			const setpointType = frame.payload.setpointType;

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

const respondToThermostatSetpointSupportedGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ThermostatSetpointCCSupportedGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					frame.payload.endpointIndex,
				),
			};

			const cc = new ThermostatSetpointCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedSetpointTypes: Object.keys(capabilities.setpoints).map(
					(k) => parseInt(k),
				),
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

const respondToThermostatSetpointCapabilitiesGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ThermostatSetpointCCCapabilitiesGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Setpoint"],
					frame.payload.endpointIndex,
				),
			};

			const setpointType = frame.payload.setpointType;
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

export const ThermostatSetpointCCBehaviors = [
	respondToThermostatSetpointGet,
	respondToThermostatSetpointSet,
	respondToThermostatSetpointSupportedGet,
	respondToThermostatSetpointCapabilitiesGet,
];
