import {
	BinarySensorCCGet,
	BinarySensorCCReport,
	BinarySensorCCSupportedGet,
	BinarySensorCCSupportedReport,
	BinarySensorType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import type { BinarySensorCCCapabilities } from "@zwave-js/testing";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

const defaultCapabilities: BinarySensorCCCapabilities = {
	supportedSensorTypes: [],
};

const respondToBinarySensorSupportedGet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof BinarySensorCCSupportedGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Binary Sensor"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new BinarySensorCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedSensorTypes: capabilities.supportedSensorTypes,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToBinarySensorGet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof BinarySensorCCGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Binary Sensor"],
					frame.payload.endpointIndex,
				),
			};

			let sensorType: BinarySensorType | undefined;
			if (
				frame.payload.sensorType == undefined
				|| frame.payload.sensorType === BinarySensorType.Any
			) {
				// If the sensor type is not specified, use the first supported one
				sensorType = capabilities.supportedSensorTypes[0];
			} else {
				sensorType = frame.payload.sensorType;
			}

			if (sensorType != undefined) {
				const value = capabilities.getValue?.(sensorType) ?? false;
				const cc = new BinarySensorCCReport(self.host, {
					nodeId: controller.host.ownNodeId,
					type: sensorType,
					value,
				});
				return { action: "sendCC", cc };
			}
			return { action: "stop" };
		}
	},
};

export const BinarySensorCCBehaviors = [
	respondToBinarySensorSupportedGet,
	respondToBinarySensorGet,
];
