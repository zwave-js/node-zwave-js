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
	type ThermostatModeCCCapabilities,
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
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatModeCCSet) {
			self.state.set(StateKeys.mode, receivedCC.mode);
			self.state.set(
				StateKeys.manufacturerData,
				receivedCC.manufacturerData,
			);
			return { action: "ok" };
		}
	},
};

const respondToThermostatModeGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatModeCCGet) {
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
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ThermostatModeCCSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Thermostat Mode"],
					receivedCC.endpointIndex,
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
