import {
	ZWaveProtocolCCNodeInformationFrame,
	ZWaveProtocolCCRequestNodeInformationFrame,
} from "@zwave-js/cc/ZWaveProtocolCC";
import {
	createMockZWaveRequestFrame,
	MockNodeBehavior,
	MockZWaveFrameType,
} from "@zwave-js/testing";

const respondToRequestNodeInfo: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ZWaveProtocolCCRequestNodeInformationFrame
		) {
			const cc = new ZWaveProtocolCCNodeInformationFrame(
				controller.host,
				{
					nodeId: self.id,
					...self.capabilities,
					supportedCCs: self.capabilities.commandClasses
						.filter((cc) => cc.isSupported)
						.map((cc) => cc.ccId),
				},
			);
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
		}
		return false;
	},
};

/** Predefined default behaviors that are required for interacting with the Mock Controller correctly */
export function createDefaultBehaviors(): MockNodeBehavior[] {
	return [respondToRequestNodeInfo];
}
