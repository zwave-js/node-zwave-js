import { ZWavePlusNodeType, ZWavePlusRoleType } from "@zwave-js/cc";
import { ZWavePlusCCGet, ZWavePlusCCReport } from "@zwave-js/cc/ZWavePlusCC";
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
					supportedCCs: [...self.implementedCCs]
						.filter(([, info]) => info.isSupported)
						.map(([ccId]) => ccId),
				},
			);
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			return true;
		}
	},
};

const respondToZWavePlusCCGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ZWavePlusCCGet
		) {
			const cc = new ZWavePlusCCReport(controller.host, {
				nodeId: self.id,
				zwavePlusVersion: 2,
				nodeType: ZWavePlusNodeType.Node,
				roleType: self.capabilities.isListening
					? ZWavePlusRoleType.AlwaysOnSlave
					: self.capabilities.isFrequentListening
					? ZWavePlusRoleType.SleepingListeningSlave
					: ZWavePlusRoleType.SleepingReportingSlave,
				installerIcon: 0x0000,
				userIcon: 0x0000,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: true,
				}),
			);
			return true;
		}
	},
};

/** Predefined default behaviors that are required for interacting with the Mock Controller correctly */
export function createDefaultBehaviors(): MockNodeBehavior[] {
	return [respondToRequestNodeInfo, respondToZWavePlusCCGet];
}
