import {
	CommandClass,
	MultiChannelCCCapabilityGet,
	MultiChannelCCCapabilityReport,
	MultiChannelCCCommandEncapsulation,
	MultiChannelCCEndPointFind,
	MultiChannelCCEndPointFindReport,
	MultiChannelCCEndPointGet,
	MultiChannelCCEndPointReport,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { type MockNodeBehavior } from "@zwave-js/testing";

const encapsulateMultiChannelCC: MockNodeBehavior = {
	transformIncomingCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultiChannelCCCommandEncapsulation) {
			// The existing machinery interprets endpointIndex from the view
			// of the controller, but we are the end node here, so re-interpret
			// the destination as the endpoint index
			receivedCC.encapsulated.endpointIndex = receivedCC
				.destination as number;
			receivedCC = receivedCC.encapsulated;
		}
		return receivedCC;
	},

	transformResponse(controller, self, receivedCC, response) {
		if (
			response.action === "sendCC"
			&& receivedCC instanceof CommandClass
			&& receivedCC.isEncapsulatedWith(
				CommandClasses["Multi Channel"],
			)
			&& !response.cc.isEncapsulatedWith(CommandClasses["Multi Channel"])
		) {
			const multiChannelEncap = receivedCC.getEncapsulatingCC(
				CommandClasses["Multi Channel"],
			);
			if (!multiChannelEncap) return response;

			// FIXME: Consider V1 of the CC
			const destination = multiChannelEncap.endpointIndex;
			const source =
				(multiChannelEncap as MultiChannelCCCommandEncapsulation)
					.destination as number;

			response.cc = new MultiChannelCCCommandEncapsulation(self.host, {
				nodeId: response.cc.nodeId,
				encapsulated: response.cc,
				endpoint: source,
				destination,
			});
		}

		return response;
	},
};

const respondToMultiChannelCCEndPointGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultiChannelCCEndPointGet) {
			const cc = new MultiChannelCCEndPointReport(self.host, {
				nodeId: controller.host.ownNodeId,
				countIsDynamic: false,
				identicalCapabilities: false,
				individualCount: self.endpoints.size,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMultiChannelCCEndPointFind: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultiChannelCCEndPointFind) {
			const request = receivedCC;
			const cc = new MultiChannelCCEndPointFindReport(self.host, {
				nodeId: controller.host.ownNodeId,
				genericClass: request.genericClass,
				specificClass: request.specificClass,
				foundEndpoints: [...self.endpoints.keys()],
				reportsToFollow: 0,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToMultiChannelCCCapabilityGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof MultiChannelCCCapabilityGet) {
			const endpoint = self.endpoints.get(
				receivedCC.requestedEndpoint,
			)!;
			const cc = new MultiChannelCCCapabilityReport(self.host, {
				nodeId: controller.host.ownNodeId,
				endpointIndex: endpoint.index,
				genericDeviceClass: endpoint?.capabilities.genericDeviceClass
					?? self.capabilities.genericDeviceClass,
				specificDeviceClass: endpoint?.capabilities.specificDeviceClass
					?? self.capabilities.specificDeviceClass,
				isDynamic: false,
				wasRemoved: false,
				supportedCCs: [...endpoint.implementedCCs.keys()]
					// Basic CC must not be included in the NIF
					.filter((ccId) => ccId !== CommandClasses.Basic),
			});
			return { action: "sendCC", cc };
		}
	},
};

export const MultiChannelCCHooks = [
	encapsulateMultiChannelCC,
];

export const MultiChannelCCBehaviors = [
	respondToMultiChannelCCEndPointGet,
	respondToMultiChannelCCEndPointFind,
	respondToMultiChannelCCCapabilityGet,
];
