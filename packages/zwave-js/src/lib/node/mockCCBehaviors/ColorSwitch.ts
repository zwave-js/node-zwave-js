import { ColorComponent, ColorComponentMap } from "@zwave-js/cc";
import {
	ColorSwitchCCGet,
	ColorSwitchCCReport,
	ColorSwitchCCSet,
	ColorSwitchCCStartLevelChange,
	ColorSwitchCCStopLevelChange,
	ColorSwitchCCSupportedGet,
	ColorSwitchCCSupportedReport,
} from "@zwave-js/cc/ColorSwitchCC";
import { CommandClasses } from "@zwave-js/core/safe";
import { getEnumMemberName } from "@zwave-js/shared";
import {
	type ColorSwitchCCCapabilities,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const defaultCapabilities: ColorSwitchCCCapabilities = {
	colorComponents: {},
};

const STATE_KEY_PREFIX = "ColorSwitch_";
const StateKeys = {
	component: (component: ColorComponent) =>
		`${STATE_KEY_PREFIX}${getEnumMemberName(ColorComponent, component)}`,
} as const;

const respondToColorSwitchSupportedGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ColorSwitchCCSupportedGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Color Switch"],
					receivedCC.endpointIndex,
				),
			};
			const cc = new ColorSwitchCCSupportedReport({
				nodeId: controller.ownNodeId,
				supportedColorComponents: Object.keys(
					capabilities.colorComponents,
				).map(
					(c) => parseInt(c),
				),
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToColorSwitchSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ColorSwitchCCSet) {
			for (const [key, value] of Object.entries(receivedCC.colorTable)) {
				const component = ColorComponentMap[
					key as any as keyof typeof ColorComponentMap
				];
				self.state.set(StateKeys.component(component), value);
			}
			return { action: "ok" };
		}
	},
};

const respondToColorSwitchGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ColorSwitchCCGet) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Color Switch"],
					receivedCC.endpointIndex,
				),
			};
			const component = receivedCC.colorComponent;
			if (component in capabilities.colorComponents) {
				const cc = new ColorSwitchCCReport({
					nodeId: controller.ownNodeId,
					colorComponent: component,
					currentValue:
						(self.state.get(StateKeys.component(component))
							?? capabilities.colorComponents[component]
							?? 0) as number,
				});
				return { action: "sendCC", cc };
			} else {
				return { action: "stop" };
			}
		}
	},
};

const respondToColorSwitchStartLevelChange: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ColorSwitchCCStartLevelChange) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Color Switch"],
					receivedCC.endpointIndex,
				),
			};

			const component = receivedCC.colorComponent;
			if (component in capabilities.colorComponents) {
				// TODO: A proper simulation should gradually transition the value. We just set it to the target value.
				self.state.set(
					StateKeys.component(component),
					receivedCC.direction === "up" ? 255 : 0,
				);

				return { action: "ok" };
			} else {
				return { action: "fail" };
			}
		}
	},
};

const respondToColorSwitchStopLevelChange: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ColorSwitchCCStopLevelChange) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Color Switch"],
					receivedCC.endpointIndex,
				),
			};

			const component = receivedCC.colorComponent;
			if (component in capabilities.colorComponents) {
				return { action: "ok" };
			} else {
				return { action: "fail" };
			}
		}
	},
};

export const ColorSwitchCCBehaviors = [
	respondToColorSwitchSupportedGet,
	respondToColorSwitchSet,
	respondToColorSwitchGet,
	respondToColorSwitchStartLevelChange,
	respondToColorSwitchStopLevelChange,
];
