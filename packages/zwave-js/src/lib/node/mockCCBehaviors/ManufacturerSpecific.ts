import {
	ManufacturerSpecificCCGet,
	ManufacturerSpecificCCReport,
} from "@zwave-js/cc/ManufacturerSpecificCC";
import { type MockNodeBehavior } from "@zwave-js/testing";

const respondToManufacturerSpecificGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof ManufacturerSpecificCCGet) {
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
