import {
	ManufacturerSpecificCCGet,
	ManufacturerSpecificCCReport,
} from "@zwave-js/cc/ManufacturerSpecificCC";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

const respondToManufacturerSpecificGet: MockNodeBehavior = {
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof ManufacturerSpecificCCGet
		) {
			const cc = new ManufacturerSpecificCCReport(self.host, {
				nodeId: self.id,
				manufacturerId: self.capabilities.manufacturerId,
				productType: self.capabilities.productType,
				productId: self.capabilities.productId,
			});
			return { action: "sendCC", cc };
		}
	},
};

export const ManufacturerSpecificCCBehaviors = [
	respondToManufacturerSpecificGet,
];
