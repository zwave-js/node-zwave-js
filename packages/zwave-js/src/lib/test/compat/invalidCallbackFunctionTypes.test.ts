import { WakeUpTime, ZWaveProtocolCCAssignSUCReturnRoute } from "@zwave-js/cc";
import { TransmitStatus, ZWaveDataRate } from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import {
	type MockControllerBehavior,
	createMockZWaveRequestFrame,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import {
	MockControllerCommunicationState,
	MockControllerStateKeys,
} from "../../controller/MockControllerState";
import {
	AssignSUCReturnRouteRequest,
	AssignSUCReturnRouteResponse,
} from "../../serialapi/network-mgmt/AssignSUCReturnRouteMessages";
import {
	DeleteSUCReturnRouteRequest,
	DeleteSUCReturnRouteRequestTransmitReport,
	DeleteSUCReturnRouteResponse,
} from "../../serialapi/network-mgmt/DeleteSUCReturnRouteMessages";
import { integrationTest } from "../integrationTestSuite";

// Repro for https://github.com/zwave-js/node-zwave-js/issues/6363

integrationTest(
	"Invalid callback function types don't trigger the unresponsive controller detection",
	{
		// debug: true,

		controllerCapabilities: {
			// Aeotec Z-Stick Gen5+, FW 1.2
			manufacturerId: 0x0086,
			productType: 0x0001,
			productId: 0x005a,
			firmwareVersion: "1.2",
			supportedFunctionTypes: [
				...getDefaultSupportedFunctionTypes(),
				FunctionType.AssignSUCReturnRoute,
				FunctionType.DeleteSUCReturnRoute,
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Incorrectly respond to AssignSUCReturnRoute with DeleteSUCReturnRoute
			const handleAssignSUCReturnRoute: MockControllerBehavior = {
				async onHostMessage(host, controller, msg) {
					if (msg instanceof AssignSUCReturnRouteRequest) {
						// Check if this command is legal right now
						const state = controller.state.get(
							MockControllerStateKeys.CommunicationState,
						) as MockControllerCommunicationState | undefined;
						if (
							state != undefined
							&& state !== MockControllerCommunicationState.Idle
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
						const command = new ZWaveProtocolCCAssignSUCReturnRoute(
							host,
							{
								nodeId: node.id,
								destinationNodeId: controller.host.ownNodeId,
								repeaters: [], // don't care
								routeIndex: 0, // don't care
								destinationSpeed: ZWaveDataRate["100k"],
								destinationWakeUp: WakeUpTime.None,
							},
						);
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
							const cb =
								new DeleteSUCReturnRouteRequestTransmitReport(
									host,
									{
										callbackId: msg.callbackId,
										transmitStatus: ack
											? TransmitStatus.OK
											: TransmitStatus.NoAck,
									},
								);

							await controller.sendToHost(cb.serialize());
						}
						return true;
					}
				},
			};
			controller.defineBehavior(handleAssignSUCReturnRoute);

			// Incorrectly respond to DeleteSUCReturnRoute with a message with function type 0
			const handleDeleteSUCReturnRoute: MockControllerBehavior = {
				async onHostMessage(host, controller, msg) {
					if (msg instanceof DeleteSUCReturnRouteRequest) {
						// Check if this command is legal right now
						const state = controller.state.get(
							MockControllerStateKeys.CommunicationState,
						) as MockControllerCommunicationState | undefined;
						if (
							state != undefined
							&& state !== MockControllerCommunicationState.Idle
						) {
							throw new Error(
								"Received DeleteSUCReturnRouteRequest while not idle",
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
						const command = new ZWaveProtocolCCAssignSUCReturnRoute(
							host,
							{
								nodeId: node.id,
								destinationNodeId: controller.host.ownNodeId,
								repeaters: [], // don't care
								routeIndex: 0, // don't care
								destinationSpeed: ZWaveDataRate["100k"],
								destinationWakeUp: WakeUpTime.None,
							},
						);
						const frame = createMockZWaveRequestFrame(command, {
							ackRequested: expectCallback,
						});
						const ackPromise = controller.sendToNode(node, frame);

						// Notify the host that the message was sent
						const res = new DeleteSUCReturnRouteResponse(host, {
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
							const cb =
								new DeleteSUCReturnRouteRequestTransmitReport(
									host,
									{
										callbackId: msg.callbackId,
										transmitStatus: ack
											? TransmitStatus.OK
											: TransmitStatus.NoAck,
									},
								);
							// @ts-expect-error 0 is not a valid function type
							cb.functionType = 0;

							await controller.sendToHost(cb.serialize());
						}
						return true;
					}
				},
			};
			controller.defineBehavior(handleDeleteSUCReturnRoute);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			mockController.clearReceivedHostMessages();
			driver.options.timeouts.sendDataCallback = 1000;
			let result = await driver.controller.assignSUCReturnRoutes(
				node.id,
			);
			t.false(result);

			result = await driver.controller.deleteSUCReturnRoutes(
				node.id,
			);
			t.false(result);
		},
	},
);
