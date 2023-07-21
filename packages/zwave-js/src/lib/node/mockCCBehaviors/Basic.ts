import { BasicCCGet, BasicCCReport, BasicCCSet } from "@zwave-js/cc/BasicCC";
import { CommandClasses } from "@zwave-js/core/safe";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const STATE_KEY_PREFIX = "Basic_";
const StateKeys = {
	currentValue: `${STATE_KEY_PREFIX}currentValue`,
} as const;

const respondToBasicGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof BasicCCGet
		) {
			// Do not respond if BasicCC is not explicitly listed as supported
			if (!self.implementedCCs.has(CommandClasses.Basic)) return false;

			const cc = new BasicCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				currentValue: (self.state.get(StateKeys.currentValue) ??
					0) as number,
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

const respondToBasicSet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof BasicCCSet
		) {
			self.state.set(StateKeys.currentValue, frame.payload.targetValue);

			return true;
		}
		return false;
	},
};

export const BasicCCBehaviors = [respondToBasicGet, respondToBasicSet];
