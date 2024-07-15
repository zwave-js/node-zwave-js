import { BasicCCGet, BasicCCReport, BasicCCSet } from "@zwave-js/cc/BasicCC";
import { CommandClasses } from "@zwave-js/core/safe";
import { type MockNodeBehavior } from "@zwave-js/testing";

const STATE_KEY_PREFIX = "Basic_";
const StateKeys = {
	currentValue: `${STATE_KEY_PREFIX}currentValue`,
} as const;

const respondToBasicGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof BasicCCGet) {
			// Do not respond if BasicCC is not explicitly listed as supported
			if (!self.implementedCCs.get(CommandClasses.Basic)?.isSupported) {
				return;
			}

			const cc = new BasicCCReport(self.host, {
				nodeId: controller.host.ownNodeId,
				currentValue: (self.state.get(StateKeys.currentValue)
					?? 0) as number,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToBasicSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof BasicCCSet) {
			self.state.set(StateKeys.currentValue, receivedCC.targetValue);
			return { action: "ok" };
		}
	},
};

export const BasicCCBehaviors = [respondToBasicGet, respondToBasicSet];
