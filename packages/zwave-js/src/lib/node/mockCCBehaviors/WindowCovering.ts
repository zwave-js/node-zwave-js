import {
	WindowCoveringCCSupportedGet,
	WindowCoveringCCSupportedReport,
} from "@zwave-js/cc/WindowCoveringCC";
import { CommandClasses } from "@zwave-js/core/safe";
import {
	MockZWaveFrameType,
	WindowCoveringCCCapabilities,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const defaultCapabilities: WindowCoveringCCCapabilities = {
	supportedParameters: [],
};

const respondToWindowCoveringSupportedGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof WindowCoveringCCSupportedGet
		) {
			const capabilities = {
				...defaultCapabilities,
				...self.getCCCapabilities(
					CommandClasses["Window Covering"],
					frame.payload.endpointIndex,
				),
			};
			const cc = new WindowCoveringCCSupportedReport(self.host, {
				nodeId: controller.host.ownNodeId,
				supportedParameters: capabilities.supportedParameters,
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

export const behaviors = [respondToWindowCoveringSupportedGet];
