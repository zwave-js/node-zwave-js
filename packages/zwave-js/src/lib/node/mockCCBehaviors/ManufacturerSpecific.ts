import {
	ManufacturerSpecificCCGet,
	ManufacturerSpecificCCReport,
} from "@zwave-js/cc/ManufacturerSpecificCC";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
} from "@zwave-js/testing";

const respondToManufacturerSpecificGet: MockNodeBehavior = {
	async onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof ManufacturerSpecificCCGet
		) {
			const cc = new ManufacturerSpecificCCReport(self.host, {
				nodeId: self.id,
				manufacturerId: self.capabilities.manufacturerId,
				productType: self.capabilities.productType,
				productId: self.capabilities.productId,
			});
			await self.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			return true;
		}
	},
};

export const behaviors = [respondToManufacturerSpecificGet];
