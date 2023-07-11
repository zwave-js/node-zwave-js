import { CommandClass } from "@zwave-js/cc";
import { TransmitOptions, ZWaveErrorCodes, isZWaveError } from "@zwave-js/core";
import { FunctionType, MessageOrigin } from "@zwave-js/serial";
import {
	createMockZWaveRequestFrame,
	type MockControllerBehavior,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import {
	MockControllerCommunicationState,
	MockControllerStateKeys,
} from "../../controller/MockControllerState";
import {
	SendDataAbort,
	SendDataRequest,
	SendDataResponse,
} from "../../serialapi/transport/SendDataMessages";
import { integrationTest } from "../integrationTestSuite";

integrationTest("abort if SendData is missing the callback", {
	// debug: true,
	// provisioningDirectory: path.join(
	// 	__dirname,
	// 	"__fixtures/supervision_binary_switch",
	// ),

	additionalDriverOptions: {
		testingHooks: {
			skipNodeInterview: true,
		},
	},

	customSetup: async (driver, controller, mockNode) => {
		// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
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
						throw new Error(
							"Received SendDataRequest while not idle",
						);
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
					const ackPromise = wait(node.capabilities.txDelay).then(
						() => {
							// Deserialize on the node after a short delay
							try {
								msg.command = CommandClass.from(node.host, {
									nodeId: controller.host.ownNodeId,
									data: msg.payload,
									origin: MessageOrigin.Host,
								});
							} catch (e) {
								let handled = false;
								if (isZWaveError(e)) {
									// We want to know when we're using a command in tests that cannot be decoded yet
									if (
										e.code ===
										ZWaveErrorCodes.Deserialization_NotImplemented
									) {
										console.error(e.message);
									} else if (
										e.code ===
										ZWaveErrorCodes.CC_NotImplemented
									) {
										// The whole CC is not implemented yet. If this happens in tests, it is because we sent a raw CC.
										try {
											msg.command = new CommandClass(
												host,
												{
													nodeId: controller.host
														.ownNodeId,
													ccId: msg.payload[0],
													ccCommand: msg.payload[1],
													payload:
														msg.payload.slice(2),
												},
											);
											handled = true;
										} catch (e: any) {
											console.error(e.message);
										}
									}
								}

								if (!handled) {
									console.error(e);
									throw e;
								}
							}

							// Send the data to the node
							const frame = createMockZWaveRequestFrame(
								msg.command,
								{
									ackRequested: !!(
										msg.transmitOptions &
										TransmitOptions.ACK
									),
								},
							);

							return controller.sendToNode(node, frame);
						},
					);

					// Notify the host that the message was sent
					const res = new SendDataResponse(host, {
						wasSent: true,
					});
					await controller.sendToHost(res.serialize());

					return true;
				} else if (msg instanceof SendDataAbort) {
					// Put the controller into sending state
					controller.state.set(
						MockControllerStateKeys.CommunicationState,
						MockControllerCommunicationState.Idle,
					);
				}
			},
		};
		controller.defineBehavior(handleSendData);
	},
	testBody: async (t, driver, node, mockController, mockNode) => {
		// Circumvent the options validation so the test doesn't take forever
		driver.options.timeouts.sendDataCallback = 1500;

		let pingResult: boolean;
		pingResult = await node.ping();
		t.false(pingResult);

		mockController.assertReceivedHostMessage(
			(msg) => msg.functionType === FunctionType.SendDataAbort,
		);
		mockController.clearReceivedHostMessages();

		pingResult = await node.ping();
		t.false(pingResult);

		mockController.assertReceivedHostMessage(
			(msg) => msg.functionType === FunctionType.SendDataAbort,
		);
		mockController.clearReceivedHostMessages();

		// The test doesn't get stuck in an infinite loop
		t.pass();
	},
});
