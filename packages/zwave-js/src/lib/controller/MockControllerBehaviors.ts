import { CommandClass, WakeUpTime } from "@zwave-js/cc";
import {
	ZWaveProtocolCC,
	ZWaveProtocolCCAssignSUCReturnRoute,
	ZWaveProtocolCCNodeInformationFrame,
	ZWaveProtocolCCRequestNodeInformationFrame,
} from "@zwave-js/cc/ZWaveProtocolCC";
import {
	isZWaveError,
	NodeType,
	TransmitOptions,
	TransmitStatus,
	ZWaveDataRate,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { MessageOrigin } from "@zwave-js/serial";
import {
	createMockZWaveRequestFrame,
	MockControllerBehavior,
	MockZWaveFrameType,
	MOCK_FRAME_ACK_TIMEOUT,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { ApplicationCommandRequest } from "../serialapi/application/ApplicationCommandRequest";
import {
	ApplicationUpdateRequest,
	ApplicationUpdateRequestNodeInfoReceived,
	ApplicationUpdateRequestNodeInfoRequestFailed,
} from "../serialapi/application/ApplicationUpdateRequest";
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
	AssignSUCReturnRouteRequest,
	AssignSUCReturnRouteRequestTransmitReport,
	AssignSUCReturnRouteResponse,
} from "../serialapi/network-mgmt/AssignSUCReturnRouteMessages";
import {
	GetNodeProtocolInfoRequest,
	GetNodeProtocolInfoResponse,
} from "../serialapi/network-mgmt/GetNodeProtocolInfoMessages";
import {
	GetSUCNodeIdRequest,
	GetSUCNodeIdResponse,
} from "../serialapi/network-mgmt/GetSUCNodeIdMessages";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "../serialapi/network-mgmt/RequestNodeInfoMessages";
import {
	SendDataRequest,
	SendDataRequestTransmitReport,
	SendDataResponse,
} from "../serialapi/transport/SendDataMessages";
import {
	MockControllerCommunicationState,
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
	},
};

const handleSendData: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof SendDataRequest) {
			// Check if this command is legal right now
			const state = controller.state.get(
				MockControllerStateKeys.CommunicationState,
			) as MockControllerCommunicationState | undefined;
			if (
				state != undefined &&
				state !== MockControllerCommunicationState.Idle
			) {
				throw new Error("Received SendDataRequest while not idle");
			}

			// Put the controller into sending state
			controller.state.set(
				MockControllerStateKeys.CommunicationState,
				MockControllerCommunicationState.Sending,
			);

			// We deferred parsing of the CC because it requires the node's host to do so.
			// Now we can do that. Also set the CC node ID to the controller's own node ID,
			// so CC knows it came from the controller's node ID.
			const node = controller.nodes.get(msg.getNodeId()!)!;
			// Simulate the frame being transmitted via radio
			const ackPromise = wait(node.capabilities.txDelay).then(() => {
				// Deserialize on the node after a short delay
				msg.command = CommandClass.from(node.host, {
					nodeId: controller.host.ownNodeId,
					data: msg.payload,
					origin: MessageOrigin.Host,
				});

				// Send the data to the node
				const frame = createMockZWaveRequestFrame(msg.command, {
					ackRequested: !!(msg.transmitOptions & TransmitOptions.ACK),
				});

				return controller.sendToNode(node, frame);
			});

			// Notify the host that the message was sent
			const res = new SendDataResponse(host, {
				wasSent: true,
			});
			await controller.sendToHost(res.serialize());

			if (msg.callbackId !== 0) {
				// Put the controller into waiting state
				controller.state.set(
					MockControllerStateKeys.CommunicationState,
					MockControllerCommunicationState.WaitingForNode,
				);

				// Wait for the ACK and notify the host
				let ack = false;
				try {
					const ackResult = await ackPromise;
					ack = !!ackResult?.ack;
				} catch (e) {
					// We want to know when we're using a command in tests that cannot be decoded yet
					if (
						isZWaveError(e) &&
						e.code ===
							ZWaveErrorCodes.Deserialization_NotImplemented
					) {
						console.error(e.message);
						throw e;
					}

					// Treat all other errors as no response
				}
				controller.state.set(
					MockControllerStateKeys.CommunicationState,
					MockControllerCommunicationState.Idle,
				);

				const cb = new SendDataRequestTransmitReport(host, {
					callbackId: msg.callbackId,
					transmitStatus: ack
						? TransmitStatus.OK
						: TransmitStatus.NoAck,
				});

				await controller.sendToHost(cb.serialize());
			} else {
				// No callback was requested, we're done
				controller.state.set(
					MockControllerStateKeys.CommunicationState,
					MockControllerCommunicationState.Idle,
				);
			}
			return true;
		}
	},
};

const handleRequestNodeInfo: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof RequestNodeInfoRequest) {
			// Check if this command is legal right now
			const state = controller.state.get(
				MockControllerStateKeys.CommunicationState,
			) as MockControllerCommunicationState | undefined;
			if (
				state != undefined &&
				state !== MockControllerCommunicationState.Idle
			) {
				throw new Error(
					"Received RequestNodeInfoRequest while not idle",
				);
			}

			// Put the controller into sending state
			controller.state.set(
				MockControllerStateKeys.CommunicationState,
				MockControllerCommunicationState.Sending,
			);

			// Send the data to the node
			const node = controller.nodes.get(msg.getNodeId()!)!;
			const command = new ZWaveProtocolCCRequestNodeInformationFrame(
				node.host,
				{ nodeId: controller.host.ownNodeId },
			);
			const frame = createMockZWaveRequestFrame(command, {
				ackRequested: false,
			});
			void controller.sendToNode(node, frame);
			const nodeInfoPromise = controller.expectNodeCC(
				node,
				MOCK_FRAME_ACK_TIMEOUT,
				(cc): cc is ZWaveProtocolCCNodeInformationFrame =>
					cc instanceof ZWaveProtocolCCNodeInformationFrame,
			);

			// Notify the host that the message was sent
			const res = new RequestNodeInfoResponse(host, {
				wasSent: true,
			});
			await controller.sendToHost(res.serialize());

			// Put the controller into waiting state
			controller.state.set(
				MockControllerStateKeys.CommunicationState,
				MockControllerCommunicationState.WaitingForNode,
			);

			// Wait for node information and notify the host
			let cb: ApplicationUpdateRequest;
			try {
				const nodeInfo = await nodeInfoPromise;
				cb = new ApplicationUpdateRequestNodeInfoReceived(host, {
					nodeInformation: {
						...nodeInfo,
						nodeId: nodeInfo.nodeId as number,
					},
				});
			} catch (e) {
				cb = new ApplicationUpdateRequestNodeInfoRequestFailed(host);
			}
			controller.state.set(
				MockControllerStateKeys.CommunicationState,
				MockControllerCommunicationState.Idle,
			);

			await controller.sendToHost(cb.serialize());
			return true;
		}
	},
};

const handleAssignSUCReturnRoute: MockControllerBehavior = {
	async onHostMessage(host, controller, msg) {
		if (msg instanceof AssignSUCReturnRouteRequest) {
			// Check if this command is legal right now
			const state = controller.state.get(
				MockControllerStateKeys.CommunicationState,
			) as MockControllerCommunicationState | undefined;
			if (
				state != undefined &&
				state !== MockControllerCommunicationState.Idle
			) {
				throw new Error(
					"Received AssignSUCReturnRouteRequest while not idle",
				);
			}

			// Put the controller into sending state
			controller.state.set(
				MockControllerStateKeys.CommunicationState,
				MockControllerCommunicationState.Sending,
			);

			const expectCallback = msg.callbackId !== 0;

			// Send the command to the node
			const node = controller.nodes.get(msg.getNodeId()!)!;
			const command = new ZWaveProtocolCCAssignSUCReturnRoute(node.host, {
				nodeId: controller.host.ownNodeId,
				repeaters: [], // don't care
				routeIndex: 0, // don't care
				destinationSpeed: ZWaveDataRate["100k"],
				destinationWakeUp: WakeUpTime.None,
			});
			const frame = createMockZWaveRequestFrame(command, {
				ackRequested: expectCallback,
			});
			const ackPromise = controller.sendToNode(node, frame);

			// Notify the host that the message was sent
			const res = new AssignSUCReturnRouteResponse(host, {
				wasExecuted: true,
			});
			await controller.sendToHost(res.serialize());

			let ack = false;
			if (expectCallback) {
				// Put the controller into waiting state
				controller.state.set(
					MockControllerStateKeys.CommunicationState,
					MockControllerCommunicationState.WaitingForNode,
				);

				// Wait for the ACK and notify the host
				try {
					const ackResult = await ackPromise;
					ack = !!ackResult?.ack;
				} catch {
					// No response
				}
			}
			controller.state.set(
				MockControllerStateKeys.CommunicationState,
				MockControllerCommunicationState.Idle,
			);

			if (expectCallback) {
				const cb = new AssignSUCReturnRouteRequestTransmitReport(host, {
					callbackId: msg.callbackId,
					transmitStatus: ack
						? TransmitStatus.OK
						: TransmitStatus.NoAck,
				});

				await controller.sendToHost(cb.serialize());
			}
			return true;
		}
	},
};

const forwardCommandClassesToHost: MockControllerBehavior = {
	async onNodeFrame(host, controller, node, frame) {
		if (
			frame.type === MockZWaveFrameType.Request &&
			frame.payload instanceof CommandClass &&
			!(frame.payload instanceof ZWaveProtocolCC)
		) {
			// This is a CC that is meant for the host application
			const msg = new ApplicationCommandRequest(host, {
				command: frame.payload,
			});
			// Nodes send commands TO the controller, so we need to fix the node ID before forwarding
			msg.getNodeId = () => node.id;
			// Simulate a serialized frame being transmitted via radio
			const data = msg.serialize();
			await wait(node.capabilities.txDelay);
			// Then receive it
			await controller.sendToHost(data);
			return true;
		}
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
		handleRequestNodeInfo,
		handleAssignSUCReturnRoute,
		forwardCommandClassesToHost,
	];
}
