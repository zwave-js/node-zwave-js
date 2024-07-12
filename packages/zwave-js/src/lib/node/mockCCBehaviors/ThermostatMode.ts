import { ThermostatMode } from "@zwave-js/cc";
import {
	ThermostatModeCCGet,
	ThermostatModeCCReport,
	ThermostatModeCCSet,
	ThermostatModeCCSupportedGet,
	ThermostatModeCCSupportedReport,
} from "@zwave-js/cc/ThermostatModeCC";
import { CommandClasses } from "@zwave-js/core/safe";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	type ThermostatModeCCCapabilities,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

const defaultCapabilities: ThermostatModeCCCapabilities = {
	supportedModes: [ThermostatMode.Off],
};

const STATE_KEY_PREFIX = "ThermostatMode_";
const StateKeys = {
	mode: `${STATE_KEY_PREFIX}mode`,
	manufacturerData: `${STATE_KEY_PREFIX}manufacturerData`,
} as const;

const respondToThermostatModeSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof ThermostatModeCCSet
		) {
			self.state.set(StateKeys.mode, frame.payload.mode);
			self.state.set(
				StateKeys.manufacturerData,
				frame.payload.manufacturerData,
			);
			return { action: "ok" };
		}
	},
};

const respondToThermostatModeGet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof ThermostatModeCCGet
		) {
			const mode = (self.state.get(StateKeys.mode)
				?? ThermostatMode.Off) as ThermostatMode;
			const manufacturerData =
				mode === ThermostatMode["Manufacturer specific"]
					? self.state.get(StateKeys.manufacturerData)
					: undefined;

			const cc = new ThermostatModeCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				// @ts-expect-error yeah yeah...
				mode,
				// @ts-expect-error I know...
				manufacturerData,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToThermostatModeSupportedGet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof ThermostatModeCCSupportedGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Mode"],
					frame.payload.endpointIndex,
				),
			};

			const cc = new ThermostatModeCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedModes: capabilities.supportedModes,
			});
			return { action: "sendCC", cc };
		}
	},
};

export const ThermostatModeCCBehaviors = [
	respondToThermostatModeGet,
	respondToThermostatModeSet,
	respondToThermostatModeSupportedGet,
];
