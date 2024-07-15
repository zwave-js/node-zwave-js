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
import { type MockNodeBehavior } from "@zwave-js/testing";

const defaultCapabilities: MultilevelSensorCCCapabilities = {
	sensors: {}, // none
};

const respondToMultilevelSensorGetSupportedSensor: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSensorCCGetSupportedSensor) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Sensor"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new MultilevelSensorCCSupportedSensorReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedSensorTypes: Object.keys(
					capabilities.sensors,
				).map((t) => parseInt(t)),
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMultilevelSensorGetSupportedScale: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSensorCCGetSupportedScale) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Sensor"],
					receivedCC.endpointIndex,
				),
			};
			const sensorType = receivedCC.sensorType;
			const supportedScales =
				capabilities.sensors[sensorType]?.supportedScales ?? [];
			const cc = new MultilevelSensorCCSupportedScaleReport(self.host, {
				nodeId: controller.host.ownNodeId,
				sensorType,
				supportedScales,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMultilevelSensorGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultilevelSensorCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Multilevel Sensor"],
					receivedCC.endpointIndex,
				),
			};
			const firstSupportedSensorType =
				Object.keys(capabilities.sensors).length > 0
					? parseInt(Object.keys(capabilities.sensors)[0])
					: undefined;
			const sensorType = receivedCC.sensorType
				?? firstSupportedSensorType
				?? 1;
			const scale = receivedCC.scale
				?? capabilities.sensors[sensorType].supportedScales[0]
				?? 0;
			const value = capabilities.getValue?.(sensorType, scale) ?? 0;
			const cc = new MultilevelSensorCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				type: sensorType,
				scale,
				value,
			});
			return { action: "sendCC", cc };
		}
	},
};

export const MultilevelSensorCCBehaviors = [
	respondToMultilevelSensorGetSupportedSensor,
	respondToMultilevelSensorGetSupportedScale,
	respondToMultilevelSensorGet,
];
