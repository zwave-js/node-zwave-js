import {
	CommandClass,
	MultiChannelCC,
	MultiChannelCCCapabilityGet,
	MultiChannelCCCapabilityReport,
	MultiChannelCCCommandEncapsulation,
	MultiChannelCCEndPointFind,
	MultiChannelCCEndPointFindReport,
	MultiChannelCCEndPointGet,
	MultiChannelCCEndPointReport,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { type MockNodeBehavior, MockZWaveFrameType } from "@zwave-js/testing";

const encapsulateMultiChannelCC: MockNodeBehavior = {
	transformIncomingFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultiChannelCCCommandEncapsulation
		) {
			// The existing machinery interprets endpointIndex from the view
			// of the controller, but we are the end node here, so re-interpret
			// the destination as the endpoint index
			frame.payload.encapsulated.endpointIndex = frame.payload
				.destination as number;
			frame.payload = frame.payload.encapsulated;
		}
		return frame;
	},

	transformResponse(controller, self, receivedFrame, response) {
		if (
			response.action === "sendCC"
			&& receivedFrame.type === MockZWaveFrameType.Request
			&& receivedFrame.payload instanceof CommandClass
			&& receivedFrame.payload.isEncapsulatedWith(
				CommandClasses["Multi Channel"],
			)
			&& !response.cc.isEncapsulatedWith(CommandClasses["Multi Channel"])
		) {
			const multiChannelEncap = receivedFrame.payload.getEncapsulatingCC(
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
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultiChannelCCEndPointGet
		) {
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
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultiChannelCCEndPointFind
		) {
			const request = frame.payload;
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
	onControllerFrame(controller, self, frame) {
		if (
			frame.type === MockZWaveFrameType.Request
			&& frame.payload instanceof MultiChannelCCCapabilityGet
		) {
			const endpoint = self.endpoints.get(
				frame.payload.requestedEndpoint,
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
				supportedCCs: [...endpoint.implementedCCs.keys()],
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
