import {
	MultilevelSensorCCGet,
	MultilevelSensorCCGetSupportedScale,
	MultilevelSensorCCGetSupportedSensor,
	MultilevelSensorCCReport,
	MultilevelSensorCCSupportedScaleReport,
	MultilevelSensorCCSupportedSensorReport,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import type { MultilevelSensorCCCapabilities } from "@zwave-js/testing";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

const defaultCapabilities: MultilevelSensorCCCapabilities = {
	sensors: {}, // none
};

const respondToMultilevelSensorGetSupportedSensor: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultilevelSensorCCGetSupportedSensor
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Sensor"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new MultilevelSensorCCSupportedSensorReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedSensorTypes: Object.keys(
					capabilities.sensors,
				).map((t) => parseInt(t)),
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

const respondToMultilevelSensorGetSupportedScale: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultilevelSensorCCGetSupportedScale
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Sensor"],
					frame.payload.endpointIndex,
				),
			};
			const sensorType = frame.payload.sensorType;
			const supportedScales =
				capabilities.sensors[sensorType]?.supportedScales ?? [];
			const cc = new MultilevelSensorCCSupportedScaleReport(self.host, {
				nodeId: controller.host.ownNodeId,
				sensorType,
				supportedScales,
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

const respondToMultilevelSensorGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultilevelSensorCCGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Sensor"],
					frame.payload.endpointIndex,
				),
			};
			const firstSupportedSensorType =
				Object.keys(capabilities.sensors).length > 0
					? parseInt(Object.keys(capabilities.sensors)[0])
					: undefined;
			const sensorType = frame.payload.sensorType
				?? firstSupportedSensorType
				?? 1;
			const scale = frame.payload.scale
				?? capabilities.sensors[sensorType].supportedScales[0]
				?? 0;
			const value = capabilities.getValue?.(sensorType, scale) ?? 0;
			const cc = new MultilevelSensorCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				type: sensorType,
				scale,
				value,
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

export const MultilevelSensorCCBehaviors = [
	respondToMultilevelSensorGetSupportedSensor,
	respondToMultilevelSensorGetSupportedScale,
	respondToMultilevelSensorGet,
];
