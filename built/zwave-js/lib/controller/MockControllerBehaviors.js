"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultBehaviors = void 0;
const cc_1 = require("@zwave-js/cc");
const ZWaveProtocolCC_1 = require("@zwave-js/cc/ZWaveProtocolCC");
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const testing_1 = require("@zwave-js/testing");
const async_1 = require("alcalzone-shared/async");
const ApplicationCommandRequest_1 = require("../serialapi/application/ApplicationCommandRequest");
const ApplicationUpdateRequest_1 = require("../serialapi/application/ApplicationUpdateRequest");
const SerialAPIStartedRequest_1 = require("../serialapi/application/SerialAPIStartedRequest");
const GetControllerCapabilitiesMessages_1 = require("../serialapi/capability/GetControllerCapabilitiesMessages");
const GetControllerVersionMessages_1 = require("../serialapi/capability/GetControllerVersionMessages");
const GetSerialApiCapabilitiesMessages_1 = require("../serialapi/capability/GetSerialApiCapabilitiesMessages");
const GetSerialApiInitDataMessages_1 = require("../serialapi/capability/GetSerialApiInitDataMessages");
const GetControllerIdMessages_1 = require("../serialapi/memory/GetControllerIdMessages");
const SoftResetRequest_1 = require("../serialapi/misc/SoftResetRequest");
const AssignSUCReturnRouteMessages_1 = require("../serialapi/network-mgmt/AssignSUCReturnRouteMessages");
const GetNodeProtocolInfoMessages_1 = require("../serialapi/network-mgmt/GetNodeProtocolInfoMessages");
const GetSUCNodeIdMessages_1 = require("../serialapi/network-mgmt/GetSUCNodeIdMessages");
const RequestNodeInfoMessages_1 = require("../serialapi/network-mgmt/RequestNodeInfoMessages");
const SendDataMessages_1 = require("../serialapi/transport/SendDataMessages");
const MockControllerState_1 = require("./MockControllerState");
const NodeInformationFrame_1 = require("./NodeInformationFrame");
const respondToGetControllerId = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof GetControllerIdMessages_1.GetControllerIdRequest) {
            const ret = new GetControllerIdMessages_1.GetControllerIdResponse(host, {
                homeId: host.homeId,
                ownNodeId: host.ownNodeId,
            });
            await controller.sendToHost(ret.serialize());
            return true;
        }
    },
};
const respondToGetSerialApiCapabilities = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof GetSerialApiCapabilitiesMessages_1.GetSerialApiCapabilitiesRequest) {
            const ret = new GetSerialApiCapabilitiesMessages_1.GetSerialApiCapabilitiesResponse(host, {
                ...controller.capabilities,
            });
            await controller.sendToHost(ret.serialize());
            return true;
        }
    },
};
const respondToGetControllerVersion = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof GetControllerVersionMessages_1.GetControllerVersionRequest) {
            const ret = new GetControllerVersionMessages_1.GetControllerVersionResponse(host, {
                ...controller.capabilities,
            });
            await controller.sendToHost(ret.serialize());
            return true;
        }
    },
};
const respondToGetControllerCapabilities = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof GetControllerCapabilitiesMessages_1.GetControllerCapabilitiesRequest) {
            const ret = new GetControllerCapabilitiesMessages_1.GetControllerCapabilitiesResponse(host, {
                ...controller.capabilities,
            });
            await controller.sendToHost(ret.serialize());
            return true;
        }
    },
};
const respondToGetSUCNodeId = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof GetSUCNodeIdMessages_1.GetSUCNodeIdRequest) {
            const sucNodeId = controller.capabilities.isStaticUpdateController
                ? host.ownNodeId
                : controller.capabilities.sucNodeId;
            const ret = new GetSUCNodeIdMessages_1.GetSUCNodeIdResponse(host, {
                sucNodeId,
            });
            await controller.sendToHost(ret.serialize());
            return true;
        }
    },
};
const respondToGetSerialApiInitData = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof GetSerialApiInitDataMessages_1.GetSerialApiInitDataRequest) {
            const nodeIds = new Set(controller.nodes.keys());
            nodeIds.add(host.ownNodeId);
            const ret = new GetSerialApiInitDataMessages_1.GetSerialApiInitDataResponse(host, {
                zwaveApiVersion: controller.capabilities.zwaveApiVersion,
                isPrimary: !controller.capabilities.isSecondary,
                nodeType: core_1.NodeType.Controller,
                supportsTimers: controller.capabilities.supportsTimers,
                isSIS: controller.capabilities.isSISPresent &&
                    controller.capabilities.isStaticUpdateController,
                nodeIds: [...nodeIds],
                zwaveChipType: controller.capabilities.zwaveChipType,
            });
            await controller.sendToHost(ret.serialize());
            return true;
        }
    },
};
const respondToSoftReset = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof SoftResetRequest_1.SoftResetRequest) {
            const ret = new SerialAPIStartedRequest_1.SerialAPIStartedRequest(host, {
                wakeUpReason: SerialAPIStartedRequest_1.SerialAPIWakeUpReason.SoftwareReset,
                watchdogEnabled: controller.capabilities.watchdogEnabled,
                isListening: true,
                ...(0, NodeInformationFrame_1.determineNIF)(),
                supportsLongRange: controller.capabilities.supportsLongRange,
            });
            await controller.sendToHost(ret.serialize());
            return true;
        }
    },
};
const respondToGetNodeProtocolInfo = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof GetNodeProtocolInfoMessages_1.GetNodeProtocolInfoRequest) {
            if (msg.requestedNodeId === host.ownNodeId) {
                const ret = new GetNodeProtocolInfoMessages_1.GetNodeProtocolInfoResponse(host, {
                    ...(0, NodeInformationFrame_1.determineNIF)(),
                    nodeType: core_1.NodeType.Controller,
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
            }
            else if (controller.nodes.has(msg.requestedNodeId)) {
                const nodeCaps = controller.nodes.get(msg.requestedNodeId).capabilities;
                const ret = new GetNodeProtocolInfoMessages_1.GetNodeProtocolInfoResponse(host, {
                    ...nodeCaps,
                });
                await controller.sendToHost(ret.serialize());
                return true;
            }
        }
    },
};
const handleSendData = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof SendDataMessages_1.SendDataRequest) {
            // Check if this command is legal right now
            const state = controller.state.get(MockControllerState_1.MockControllerStateKeys.CommunicationState);
            if (state != undefined &&
                state !== MockControllerState_1.MockControllerCommunicationState.Idle) {
                throw new Error("Received SendDataRequest while not idle");
            }
            // Put the controller into sending state
            controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.Sending);
            // We deferred parsing of the CC because it requires the node's host to do so.
            // Now we can do that. Also set the CC node ID to the controller's own node ID,
            // so CC knows it came from the controller's node ID.
            const node = controller.nodes.get(msg.getNodeId());
            // Simulate the frame being transmitted via radio
            const ackPromise = (0, async_1.wait)(node.capabilities.txDelay).then(() => {
                // Deserialize on the node after a short delay
                msg.command = cc_1.CommandClass.from(node.host, {
                    nodeId: controller.host.ownNodeId,
                    data: msg.payload,
                    origin: serial_1.MessageOrigin.Host,
                });
                // Send the data to the node
                const frame = (0, testing_1.createMockZWaveRequestFrame)(msg.command, {
                    ackRequested: !!(msg.transmitOptions & core_1.TransmitOptions.ACK),
                });
                return controller.sendToNode(node, frame);
            });
            // Notify the host that the message was sent
            const res = new SendDataMessages_1.SendDataResponse(host, {
                wasSent: true,
            });
            await controller.sendToHost(res.serialize());
            if (msg.callbackId !== 0) {
                // Put the controller into waiting state
                controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.WaitingForNode);
                // Wait for the ACK and notify the host
                let ack = false;
                try {
                    const ackResult = await ackPromise;
                    ack = !!ackResult?.ack;
                }
                catch (e) {
                    // We want to know when we're using a command in tests that cannot be decoded yet
                    if ((0, core_1.isZWaveError)(e) &&
                        e.code ===
                            core_1.ZWaveErrorCodes.Deserialization_NotImplemented) {
                        console.error(e.message);
                        throw e;
                    }
                    // Treat all other errors as no response
                }
                controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.Idle);
                const cb = new SendDataMessages_1.SendDataRequestTransmitReport(host, {
                    callbackId: msg.callbackId,
                    transmitStatus: ack
                        ? core_1.TransmitStatus.OK
                        : core_1.TransmitStatus.NoAck,
                });
                await controller.sendToHost(cb.serialize());
            }
            else {
                // No callback was requested, we're done
                controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.Idle);
            }
            return true;
        }
    },
};
const handleRequestNodeInfo = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof RequestNodeInfoMessages_1.RequestNodeInfoRequest) {
            // Check if this command is legal right now
            const state = controller.state.get(MockControllerState_1.MockControllerStateKeys.CommunicationState);
            if (state != undefined &&
                state !== MockControllerState_1.MockControllerCommunicationState.Idle) {
                throw new Error("Received RequestNodeInfoRequest while not idle");
            }
            // Put the controller into sending state
            controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.Sending);
            // Send the data to the node
            const node = controller.nodes.get(msg.getNodeId());
            const command = new ZWaveProtocolCC_1.ZWaveProtocolCCRequestNodeInformationFrame(node.host, { nodeId: controller.host.ownNodeId });
            const frame = (0, testing_1.createMockZWaveRequestFrame)(command, {
                ackRequested: false,
            });
            void controller.sendToNode(node, frame);
            const nodeInfoPromise = controller.expectNodeCC(node, testing_1.MOCK_FRAME_ACK_TIMEOUT, (cc) => cc instanceof ZWaveProtocolCC_1.ZWaveProtocolCCNodeInformationFrame);
            // Notify the host that the message was sent
            const res = new RequestNodeInfoMessages_1.RequestNodeInfoResponse(host, {
                wasSent: true,
            });
            await controller.sendToHost(res.serialize());
            // Put the controller into waiting state
            controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.WaitingForNode);
            // Wait for node information and notify the host
            let cb;
            try {
                const nodeInfo = await nodeInfoPromise;
                cb = new ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeInfoReceived(host, {
                    nodeInformation: {
                        ...nodeInfo,
                        nodeId: nodeInfo.nodeId,
                    },
                });
            }
            catch (e) {
                cb = new ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeInfoRequestFailed(host);
            }
            controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.Idle);
            await controller.sendToHost(cb.serialize());
            return true;
        }
    },
};
const handleAssignSUCReturnRoute = {
    async onHostMessage(host, controller, msg) {
        if (msg instanceof AssignSUCReturnRouteMessages_1.AssignSUCReturnRouteRequest) {
            // Check if this command is legal right now
            const state = controller.state.get(MockControllerState_1.MockControllerStateKeys.CommunicationState);
            if (state != undefined &&
                state !== MockControllerState_1.MockControllerCommunicationState.Idle) {
                throw new Error("Received AssignSUCReturnRouteRequest while not idle");
            }
            // Put the controller into sending state
            controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.Sending);
            const expectCallback = msg.callbackId !== 0;
            // Send the command to the node
            const node = controller.nodes.get(msg.getNodeId());
            const command = new ZWaveProtocolCC_1.ZWaveProtocolCCAssignSUCReturnRoute(node.host, {
                nodeId: controller.host.ownNodeId,
                repeaters: [],
                routeIndex: 0,
                destinationSpeed: core_1.ZWaveDataRate["100k"],
                destinationWakeUp: cc_1.WakeUpTime.None,
            });
            const frame = (0, testing_1.createMockZWaveRequestFrame)(command, {
                ackRequested: expectCallback,
            });
            const ackPromise = controller.sendToNode(node, frame);
            // Notify the host that the message was sent
            const res = new AssignSUCReturnRouteMessages_1.AssignSUCReturnRouteResponse(host, {
                wasExecuted: true,
            });
            await controller.sendToHost(res.serialize());
            let ack = false;
            if (expectCallback) {
                // Put the controller into waiting state
                controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.WaitingForNode);
                // Wait for the ACK and notify the host
                try {
                    const ackResult = await ackPromise;
                    ack = !!ackResult?.ack;
                }
                catch {
                    // No response
                }
            }
            controller.state.set(MockControllerState_1.MockControllerStateKeys.CommunicationState, MockControllerState_1.MockControllerCommunicationState.Idle);
            if (expectCallback) {
                const cb = new AssignSUCReturnRouteMessages_1.AssignSUCReturnRouteRequestTransmitReport(host, {
                    callbackId: msg.callbackId,
                    transmitStatus: ack
                        ? core_1.TransmitStatus.OK
                        : core_1.TransmitStatus.NoAck,
                });
                await controller.sendToHost(cb.serialize());
            }
            return true;
        }
    },
};
const forwardCommandClassesToHost = {
    async onNodeFrame(host, controller, node, frame) {
        if (frame.type === testing_1.MockZWaveFrameType.Request &&
            frame.payload instanceof cc_1.CommandClass &&
            !(frame.payload instanceof ZWaveProtocolCC_1.ZWaveProtocolCC)) {
            // This is a CC that is meant for the host application
            const msg = new ApplicationCommandRequest_1.ApplicationCommandRequest(host, {
                command: frame.payload,
            });
            // Nodes send commands TO the controller, so we need to fix the node ID before forwarding
            msg.getNodeId = () => node.id;
            // Simulate a serialized frame being transmitted via radio
            const data = msg.serialize();
            await (0, async_1.wait)(node.capabilities.txDelay);
            // Then receive it
            await controller.sendToHost(data);
            return true;
        }
    },
};
/** Predefined default behaviors that are required for interacting with the driver correctly */
function createDefaultBehaviors() {
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
exports.createDefaultBehaviors = createDefaultBehaviors;
//# sourceMappingURL=MockControllerBehaviors.js.map