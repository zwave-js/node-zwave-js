import {
	ConfigurationCCDefaultReset,
	ConfigurationCCGet,
	ConfigurationCCInfoGet,
	ConfigurationCCInfoReport,
	ConfigurationCCNameGet,
	ConfigurationCCNameReport,
	ConfigurationCCPropertiesGet,
	ConfigurationCCPropertiesReport,
	ConfigurationCCReport,
	ConfigurationCCSet,
} from "@zwave-js/cc/ConfigurationCC";
import { CommandClasses, ConfigValueFormat } from "@zwave-js/core/safe";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type ConfigurationCCCapabilities,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const defaultCapabilities: ConfigurationCCCapabilities = {
	bulkSupport: false,
	parameters: [],
};

const STATE_KEY_PREFIX = "Configuration_";
const StateKeys = {
	value: (param: number) => `${STATE_KEY_PREFIX}value_${param}`,
} as const;

const respondToConfigurationGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ConfigurationCCGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Configuration,
					frame.payload.endpointIndex,
				),
			};

			const parameter = frame.payload.parameter;

			const paramInfo = capabilities.parameters.find(
				(p) => p["#"] === parameter,
			);

			// Do not respond if the parameter is not supported
			if (!paramInfo) return true;

			const value =
				(self.state.get(StateKeys.value(parameter)) as number) ??
				paramInfo.defaultValue ??
				0;

			const cc = new ConfigurationCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				parameter,
				value,
				valueSize: paramInfo.valueSize,
				valueFormat: paramInfo.format,
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

const respondToConfigurationSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ConfigurationCCSet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Configuration,
					frame.payload.endpointIndex,
				),
			};
			const parameter = frame.payload.parameter;
			const paramInfo = capabilities.parameters.find(
				(p) => p["#"] === parameter,
			);
			// Do nothing if the parameter is not supported
			if (!paramInfo) return true;

			if (frame.payload.resetToDefault) {
				self.state.delete(StateKeys.value(parameter));
				return true;
			}

			const value = frame.payload.value!;

			// Do nothing if the value is out of range
			if (paramInfo.minValue != undefined && value < paramInfo.minValue) {
				return true;
			} else if (
				paramInfo.maxValue != undefined &&
				value > paramInfo.maxValue
			) {
				return true;
			}

			self.state.set(StateKeys.value(parameter), value);

			return true;
		}
		return false;
	},
};

const respondToConfigurationDefaultReset: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ConfigurationCCDefaultReset
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Configuration,
					frame.payload.endpointIndex,
				),
			};
			for (const paramInfo of capabilities.parameters) {
				self.state.delete(StateKeys.value(paramInfo["#"]));
			}

			return true;
		}
		return false;
	},
};

const respondToConfigurationNameGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ConfigurationCCNameGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Configuration,
					frame.payload.endpointIndex,
				),
			};
			const parameter = frame.payload.parameter;
			const paramInfo = capabilities.parameters.find(
				(p) => p["#"] === parameter,
			);
			// Do nothing if the parameter is not supported
			if (!paramInfo) return true;

			const cc = new ConfigurationCCNameReport(self.host, {
				nodeId: controller.host.ownNodeId,
				parameter,
				name: paramInfo.name ?? "",
				reportsToFollow: 0,
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

const respondToConfigurationInfoGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ConfigurationCCInfoGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Configuration,
					frame.payload.endpointIndex,
				),
			};
			const parameter = frame.payload.parameter;
			const paramInfo = capabilities.parameters.find(
				(p) => p["#"] === parameter,
			);
			// Do nothing if the parameter is not supported
			if (!paramInfo) return true;

			const cc = new ConfigurationCCInfoReport(self.host, {
				nodeId: controller.host.ownNodeId,
				parameter,
				info: paramInfo.info ?? "",
				reportsToFollow: 0,
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

const respondToConfigurationPropertiesGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ConfigurationCCPropertiesGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses.Configuration,
					frame.payload.endpointIndex,
				),
			};
			const parameter = frame.payload.parameter;
			const paramIndex = capabilities.parameters.findIndex(
				(p) => p["#"] === parameter,
			);
			const paramInfo = capabilities.parameters[paramIndex];
			const nextParameter = capabilities.parameters[paramIndex + 1];

			let cc: ConfigurationCCPropertiesReport;

			// If the parameter is not supported, respond with the first supported parameter
			if (!paramInfo) {
				cc = new ConfigurationCCPropertiesReport(self.host, {
					nodeId: controller.host.ownNodeId,
					parameter,
					valueFormat: 0,
					valueSize: 0,
					nextParameter: nextParameter?.["#"] ?? 0,
				});
			} else {
				cc = new ConfigurationCCPropertiesReport(self.host, {
					nodeId: controller.host.ownNodeId,
					parameter,
					valueSize: paramInfo.valueSize,
					valueFormat:
						paramInfo.format ?? ConfigValueFormat.SignedInteger,
					minValue: paramInfo.minValue,
					maxValue: paramInfo.maxValue,
					defaultValue: paramInfo.defaultValue,
					isAdvanced: paramInfo.isAdvanced ?? false,
					altersCapabilities: paramInfo.altersCapabilities ?? false,
					isReadonly: paramInfo.readonly ?? false,
					noBulkSupport: !(capabilities.bulkSupport ?? false),
					nextParameter: nextParameter?.["#"] ?? 0,
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

export const behaviors = [
	respondToConfigurationGet,
	respondToConfigurationSet,
	respondToConfigurationNameGet,
	respondToConfigurationInfoGet,
	respondToConfigurationPropertiesGet,
	respondToConfigurationDefaultReset,
];
