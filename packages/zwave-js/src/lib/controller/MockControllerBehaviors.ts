import { NodeType, TransmitOptions, TransmitStatus } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockControllerBehavior,
} from "@zwave-js/testing";
import {
	SerialAPIStartedRequest,
	SerialAPIWakeUpReason,
} from "../serialapi/application/SerialAPIStartedRequest";
import {
	GetControllerCapabilitiesRequest,
	GetControllerCapabilitiesResponse,
} from "../serialapi/capability/GetControllerCapabilitiesMessages";
import {
	GetControllerVersionRequest,
	GetControllerVersionResponse,
} from "../serialapi/capability/GetControllerVersionMessages";
import {
	GetSerialApiCapabilitiesRequest,
	GetSerialApiCapabilitiesResponse,
} from "../serialapi/capability/GetSerialApiCapabilitiesMessages";
import {
	GetSerialApiInitDataRequest,
	GetSerialApiInitDataResponse,
} from "../serialapi/capability/GetSerialApiInitDataMessages";
import {
	GetControllerIdRequest,
	GetControllerIdResponse,
} from "../serialapi/memory/GetControllerIdMessages";
import { SoftResetRequest } from "../serialapi/misc/SoftResetRequest";
import {
	GetNodeProtocolInfoRequest,
	GetNodeProtocolInfoResponse,
} from "../serialapi/network-mgmt/GetNodeProtocolInfoMessages";
import {
	GetSUCNodeIdRequest,
	GetSUCNodeIdResponse,
} from "../serialapi/network-mgmt/GetSUCNodeIdMessages";
import {
	SendDataRequest,
	SendDataRequestTransmitReport,
	SendDataResponse,
} from "../serialapi/transport/SendDataMessages";
import {
	MockControllerSendDataState,
	MockControllerStateKeys,
} from "./MockControllerState";
import { determineNIF } from "./NodeInformationFrame";

const respondToGetControllerId: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof GetControllerIdRequest) {
			const ret = new GetControllerIdResponse(host, {
				homeId: host.homeId,
				ownNodeId: host.ownNodeId,
			});
			await controller.sendToHost(ret.serialize());
			return true;
		}
		return false;
	},
};

const respondToGetSerialApiCapabilities: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof GetSerialApiCapabilitiesRequest) {
			const ret = new GetSerialApiCapabilitiesResponse(host, {
				...controller.capabilities,
			});
			await controller.sendToHost(ret.serialize());
			return true;
		}
		return false;
	},
};

const respondToGetControllerVersion: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof GetControllerVersionRequest) {
			const ret = new GetControllerVersionResponse(host, {
				...controller.capabilities,
			});
			await controller.sendToHost(ret.serialize());
			return true;
		}
		return false;
	},
};

const respondToGetControllerCapabilities: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof GetControllerCapabilitiesRequest) {
			const ret = new GetControllerCapabilitiesResponse(host, {
				...controller.capabilities,
			});
			await controller.sendToHost(ret.serialize());
			return true;
		}
		return false;
	},
};

const respondToGetSUCNodeId: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof GetSUCNodeIdRequest) {
			const sucNodeId = controller.capabilities.isStaticUpdateController
				? host.ownNodeId
				: controller.capabilities.sucNodeId;
			const ret = new GetSUCNodeIdResponse(host, {
				sucNodeId,
			});
			await controller.sendToHost(ret.serialize());
			return true;
		}
		return false;
	},
};

const respondToGetSerialApiInitData: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof GetSerialApiInitDataRequest) {
			const nodeIds = new Set(controller.nodes.keys());
			nodeIds.add(host.ownNodeId);

			const ret = new GetSerialApiInitDataResponse(host, {
				zwaveApiVersion: controller.capabilities.zwaveApiVersion,
				isPrimary: !controller.capabilities.isSecondary,
				nodeType: NodeType.Controller,
				supportsTimers: controller.capabilities.supportsTimers,
				isSIS:
					controller.capabilities.isSISPresent &&
					controller.capabilities.isStaticUpdateController,
				nodeIds: [...nodeIds],
				zwaveChipType: controller.capabilities.zwaveChipType,
			});
			await controller.sendToHost(ret.serialize());
			return true;
		}
		return false;
	},
};

const respondToSoftReset: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof SoftResetRequest) {
			const ret = new SerialAPIStartedRequest(host, {
				wakeUpReason: SerialAPIWakeUpReason.SoftwareReset,
				watchdogEnabled: controller.capabilities.watchdogEnabled,
				isListening: true,
				...determineNIF(),
				supportsLongRange: controller.capabilities.supportsLongRange,
			});
			await controller.sendToHost(ret.serialize());
			return true;
		}
		return false;
	},
};

const respondToGetNodeProtocolInfo: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof GetNodeProtocolInfoRequest) {
			if (msg.requestedNodeId === host.ownNodeId) {
				const ret = new GetNodeProtocolInfoResponse(host, {
					...determineNIF(),
					nodeType: NodeType.Controller,
					isListening: true,
					isFrequentListening: false,
					isRouting: true,
					supportsSecurity: false,
					supportsBeaming: true,
					supportedDataRates: [9600, 40000, 100000],
					optionalFunctionality: true,
					protocolVersion: 3,
				});
				await controller.sendToHost(ret.serialize());
				return true;
			} else if (controller.nodes.has(msg.requestedNodeId)) {
				const nodeCaps = controller.nodes.get(
					msg.requestedNodeId,
				)!.capabilities;
				const ret = new GetNodeProtocolInfoResponse(host, {
					...nodeCaps,
				});
				await controller.sendToHost(ret.serialize());
				return true;
			}
		}
		return false;
	},
};

const handleSendData: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof SendDataRequest) {
			// Check if this command is legal right now
			const state = controller.state.get(
				MockControllerStateKeys.SendDataState,
			) as MockControllerSendDataState | undefined;
			if (
				state != undefined &&
				state !== MockControllerSendDataState.Idle
			) {
				throw new Error("Received SendDataRequest while not idle");
			}

			// Put the controller into sending state
			controller.state.set(
				MockControllerStateKeys.SendDataState,
				MockControllerSendDataState.Sending,
			);

			// Send the data to the node
			const frame = createMockZWaveRequestFrame(msg.payload, {
				ackRequested: !!(msg.transmitOptions & TransmitOptions.ACK),
			});
			const node = controller.nodes.get(msg.getNodeId()!)!;
			const ackPromise = controller.sendToNode(node, frame);

			// Notify the host that the message was sent
			const res = new SendDataResponse(host, {
				wasSent: true,
			});
			await controller.sendToHost(res.serialize());
			// Put the controller into waiting state
			controller.state.set(
				MockControllerStateKeys.SendDataState,
				MockControllerSendDataState.WaitingForAck,
			);

			// Wait for the ACK and notify the host
			let ack = false;
			try {
				// eslint-disable-next-line @typescript-eslint/await-thenable
				const ackResult = await ackPromise;
				ack = !!ackResult?.ack;
			} catch {
				// No response
			}
			controller.state.set(
				MockControllerStateKeys.SendDataState,
				MockControllerSendDataState.Idle,
			);

			const cb = new SendDataRequestTransmitReport(host, {
				callbackId: msg.callbackId,
				transmitStatus: ack ? TransmitStatus.OK : TransmitStatus.NoAck,
			});

			await controller.sendToHost(cb.serialize());
		}
		return false;
	},
};

/** Predefined default behaviors that are required for interacting with the driver correctly */
export function createDefaultBehaviors(): MockControllerBehavior[] {
	return [
		respondToGetControllerId,
		respondToGetSerialApiCapabilities,
		respondToGetControllerVersion,
		respondToGetControllerCapabilities,
		respondToGetSUCNodeId,
		respondToGetSerialApiInitData,
		respondToSoftReset,
		respondToGetNodeProtocolInfo,
		handleSendData,
	];
}
