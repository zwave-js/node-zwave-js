import {
	EnergyProductionParameter,
	getEnergyProductionScale,
} from "@zwave-js/cc";
import {
	EnergyProductionCCGet,
	EnergyProductionCCReport,
} from "@zwave-js/cc/EnergyProductionCC";
import { CommandClasses } from "@zwave-js/core/safe";
import { getEnumMemberName } from "@zwave-js/shared";
import {
	type EnergyProductionCCCapabilities,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const defaultCapabilities: EnergyProductionCCCapabilities = {
	values: {
		Power: {
			value: 0,
			scale: 0,
		},
		"Production Total": {
			value: 0,
			scale: 0,
		},
		"Production Today": {
			value: 0,
			scale: 0,
		},
		"Total Time": {
			value: 0,
			scale: 0,
		},
	},
};

const respondToEnergyProductionGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof EnergyProductionCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Energy Production"],
					receivedCC.endpointIndex,
				),
			};

			const result = capabilities.values[
				getEnumMemberName(
					EnergyProductionParameter,
					receivedCC.parameter,
				) as unknown as keyof typeof capabilities.values
			];

			const cc = new EnergyProductionCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				parameter: receivedCC.parameter,
				value: result?.value ?? 0,
				scale: getEnergyProductionScale(
					receivedCC.parameter,
					result?.scale ?? 0,
				),
			});
			return { action: "sendCC", cc };
		}
	},
};

export const EnergyProductionCCBehaviors = [respondToEnergyProductionGet];
