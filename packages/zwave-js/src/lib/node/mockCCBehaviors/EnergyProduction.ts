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
	createMockZWaveRequestFrame,
	EnergyProductionCCCapabilities,
	MockZWaveFrameType,
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
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof EnergyProductionCCGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Energy Production"],
					frame.payload.endpointIndex,
				),
			};

			const result =
				capabilities.values[
					getEnumMemberName(
						EnergyProductionParameter,
						frame.payload.parameter,
					) as unknown as keyof typeof capabilities.values
				];

			const cc = new EnergyProductionCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				parameter: frame.payload.parameter,
				value: result?.value ?? 0,
				scale: getEnergyProductionScale(
					frame.payload.parameter,
					result?.scale ?? 0,
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

export const behaviors = [respondToEnergyProductionGet];
