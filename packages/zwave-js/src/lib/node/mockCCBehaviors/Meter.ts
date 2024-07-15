import {
	MeterCCGet,
	MeterCCReport,
	MeterCCReset,
	MeterCCSupportedGet,
	MeterCCSupportedReport,
	RateType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import {
	type MeterCCCapabilities,
	type MockNodeBehavior,
} from "@zwave-js/testing";

export const defaultCapabilities: MeterCCCapabilities = {
	meterType: 0x01, // Electric
	supportedScales: [0x00], // kWh
	supportedRateTypes: [RateType.Consumed],
	supportsReset: true,
};

const respondToMeterSupportedGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MeterCCSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Meter,
					receivedCC.endpointIndex,
				),
			};
			const cc = new MeterCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				type: capabilities.meterType,
				supportedScales: capabilities.supportedScales,
				supportedRateTypes: capabilities.supportedRateTypes,
				supportsReset: capabilities.supportsReset,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMeterGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MeterCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Meter,
					receivedCC.endpointIndex,
				),
			};
			const scale = receivedCC.scale
				?? capabilities.supportedScales[0];
			const rateType = receivedCC.rateType
				?? capabilities.supportedRateTypes[0]
				?? RateType.Consumed;

			const value = capabilities.getValue?.(scale, rateType) ?? {
				value: 0,
				deltaTime: 0,
			};
			const normalizedValue = typeof value === "number"
				? {
					value,
					deltaTime: 0,
				}
				: value;

			const cc = new MeterCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				type: capabilities.meterType,
				scale,
				rateType,
				...normalizedValue,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMeterReset: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MeterCCReset) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Meter,
					receivedCC.endpointIndex,
				),
			};

			const cc = receivedCC;
			if (
				cc.type != undefined
				&& cc.scale != undefined
				&& cc.rateType != undefined
				&& cc.targetValue != undefined
			) {
				capabilities.onReset?.({
					scale: cc.scale,
					rateType: cc.rateType,
					targetValue: cc.targetValue,
				});
			} else {
				capabilities.onReset?.();
			}
			return { action: "ok" };
		}
	},
};

export const MeterCCBehaviors = [
	respondToMeterSupportedGet,
	respondToMeterGet,
	respondToMeterReset,
];
