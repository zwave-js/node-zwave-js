import { FunctionType } from "@zwave-js/serial";
import {
	type MockControllerBehavior,
	type MockControllerCapabilities,
	getDefaultMockControllerCapabilities,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import {
	MockControllerCommunicationState,
	MockControllerStateKeys,
} from "../../controller/MockControllerState.js";

import {
	NodeStatus,
	TransmitStatus,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";

import {
	SendDataAbort,
	SendDataRequest,
	SendDataRequestTransmitReport,
} from "@zwave-js/serial/serialapi";
import { integrationTest } from "../integrationTestSuite.js";

let shouldTimeOut: boolean;
let lastCallbackId: number;

const controllerCapabilitiesNoBridge: MockControllerCapabilities = {
	// No support for Bridge API:
	...getDefaultMockControllerCapabilities(),
	supportedFunctionTypes: getDefaultSupportedFunctionTypes().filter(
		(ft) =>
			ft !== FunctionType.SendDataBridge
			&& ft !== FunctionType.SendDataMulticastBridge,
	),
};

integrationTest(
	"Abort transmission and wait for callback if SendData is missing the response",
	{
		// debug: true,

		controllerCapabilities: controllerCapabilitiesNoBridge,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the response and callback never get sent
			const handleBrokenSendData: MockControllerBehavior = {
				async onHostMessage(controller, msg) {
					// If the controller is operating normally, defer to the default behavior
					if (!shouldTimeOut) return false;

					if (msg instanceof SendDataRequest) {
						// Check if this command is legal right now
						const state = controller.state.get(
							MockControllerStateKeys.CommunicationState,
						) as MockControllerCommunicationState | undefined;
						if (
							state != undefined
							&& state !== MockControllerCommunicationState.Idle
						) {
							throw new Error(
								"Received SendDataRequest while not idle",
							);
						}

						lastCallbackId = msg.callbackId!;

						return true;
					} else if (msg instanceof SendDataAbort) {
						// Finish the transmission by sending the callback
						const cb = new SendDataRequestTransmitReport({
							callbackId: lastCallbackId,
							transmitStatus: TransmitStatus.NoAck,
						});

						setTimeout(() => {
							controller.sendMessageToHost(cb);
						}, 100);

						// Put the controller into idle state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Idle,
						);

						return true;
					}
				},
			};
			mockController.defineBehavior(handleBrokenSendData);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.response = 500;
			driver.options.timeouts.sendDataCallback = 1500;

			node.markAsAlive();
			shouldTimeOut = true;

			const basicSetPromise = node.commandClasses.Basic.set(99)
				.catch((e) => e);

			await wait(2000);

			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
			);
			mockController.clearReceivedHostMessages();

			await assertZWaveError(t.expect, await basicSetPromise, {
				errorCode: ZWaveErrorCodes.Controller_Timeout,
				context: "response",
			});

			// The stick should NOT have been soft-reset
			await wait(1000);
			t.expect(() =>
				mockController.assertReceivedHostMessage(
					(msg) => msg.functionType === FunctionType.SoftReset,
				)
			).toThrow();

			// And the node should be marked dead
			t.expect(node.status).toBe(NodeStatus.Dead);
		},
	},
);

integrationTest(
	"Recover controller if callback times out after timed out SendData response",
	{
		// debug: true,

		controllerCapabilities: controllerCapabilitiesNoBridge,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the response and callback never get sent
			const handleBrokenSendData: MockControllerBehavior = {
				async onHostMessage(controller, msg) {
					// If the controller is operating normally, defer to the default behavior
					if (!shouldTimeOut) return false;

					if (msg instanceof SendDataRequest) {
						// Check if this command is legal right now
						const state = controller.state.get(
							MockControllerStateKeys.CommunicationState,
						) as MockControllerCommunicationState | undefined;
						if (
							state != undefined
							&& state !== MockControllerCommunicationState.Idle
						) {
							throw new Error(
								"Received SendDataRequest while not idle",
							);
						}

						lastCallbackId = msg.callbackId!;

						// Don't send the response or the callback

						return true;
					} else if (msg instanceof SendDataAbort) {
						// Return to normal operation
						shouldTimeOut = false;
					}
				},
			};
			mockController.defineBehavior(handleBrokenSendData);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.response = 500;
			driver.options.timeouts.sendDataCallback = 1500;

			node.markAsAlive();
			shouldTimeOut = true;

			const basicSetPromise = node.commandClasses.Basic.set(99);

			await wait(2000);

			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
			);
			mockController.clearReceivedHostMessages();

			// The stick should have been soft-reset
			await wait(1000);
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SoftReset,
			);

			// And the command should eventually succeed
			await basicSetPromise;
		},
	},
);

// integrationTest(
// 	"Mark node as dead if SendData is still missing the callback after soft-reset",
// 	{
// 		// Real-world experience has shown that for older controllers this situation can be caused by dead nodes
// 		// We don't want to restart the driver in that case, but mark the node as dead instead
// 		// debug: true,

// 		// provisioningDirectory: path.join(
// 		// 	__dirname,
// 		// 	"__fixtures/supervision_binary_switch",
// 		// ),

// 		additionalDriverOptions: {
// 			testingHooks: {
// 				skipNodeInterview: true,
// 			},
// 		},

// 		customSetup: async (driver, mockController, mockNode) => {
// 			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
// 			const handleBrokenSendData: MockControllerBehavior = {
// 				async onHostMessage(controller, msg) {
// 					if (msg instanceof SendDataRequest) {
// 						// Check if this command is legal right now
// 						const state = controller.state.get(
// 							MockControllerStateKeys.CommunicationState,
// 						) as MockControllerCommunicationState | undefined;
// 						if (
// 							state != undefined
// 							&& state !== MockControllerCommunicationState.Idle
// 						) {
// 							throw new Error(
// 								"Received SendDataRequest while not idle",
// 							);
// 						}

// 						// Put the controller into sending state
// 						controller.state.set(
// 							MockControllerStateKeys.CommunicationState,
// 							MockControllerCommunicationState.Sending,
// 						);

// 						// Notify the host that the message was sent
// 						const res = new SendDataResponse({
// 							wasSent: true,
// 						});
// 						await controller.sendMessageToHost(res);

// 						return true;
// 					} else if (msg instanceof SendDataAbort) {
// 						// Put the controller into idle state
// 						controller.state.set(
// 							MockControllerStateKeys.CommunicationState,
// 							MockControllerCommunicationState.Idle,
// 						);

// 						return true;
// 					}
// 				},
// 			};
// 			mockController.defineBehavior(handleBrokenSendData);
// 		},
// 		testBody: async (t, driver, node, mockController, mockNode) => {
// 			// Circumvent the options validation so the test doesn't take forever
// 			driver.options.timeouts.sendDataCallback = 1500;
// 			shouldTimeOut = true;

// 			const errorSpy = Sinon.spy();
// 			driver.on("error", errorSpy);

// 			const pingPromise = node.ping();

// 			await wait(2000);

// 			mockController.assertReceivedHostMessage(
// 				(msg) => msg.functionType === FunctionType.SendDataAbort,
// 			);
// 			mockController.clearReceivedHostMessages();

// 			// The stick should have been soft-reset
// 			await wait(1000);
// 			mockController.assertReceivedHostMessage(
// 				(msg) => msg.functionType === FunctionType.SoftReset,
// 			);

// 			// The ping should eventually fail and the node be marked dead
// 			t.false(await pingPromise);

// 			t.is(node.status, NodeStatus.Dead);

// 			// The error event should not have been emitted
// 			await wait(300);
// 			t.is(errorSpy.callCount, 0);
// 		},
// 	},
// );

// integrationTest(
// 	"Missing callback recovery works if the command can be retried",
// 	{
// 		// debug: true,

// 		// provisioningDirectory: path.join(
// 		// 	__dirname,
// 		// 	"__fixtures/supervision_binary_switch",
// 		// ),

// 		additionalDriverOptions: {
// 			testingHooks: {
// 				skipNodeInterview: true,
// 			},
// 		},

// 		customSetup: async (driver, mockController, mockNode) => {
// 			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
// 			const handleBrokenSendData: MockControllerBehavior = {
// 				async onHostMessage(controller, msg) {
// 					// If the controller is operating normally, defer to the default behavior
// 					if (!shouldTimeOut) return false;

// 					if (msg instanceof SendDataRequest) {
// 						// Check if this command is legal right now
// 						const state = controller.state.get(
// 							MockControllerStateKeys.CommunicationState,
// 						) as MockControllerCommunicationState | undefined;
// 						if (
// 							state != undefined
// 							&& state !== MockControllerCommunicationState.Idle
// 						) {
// 							throw new Error(
// 								"Received SendDataRequest while not idle",
// 							);
// 						}

// 						// Put the controller into sending state
// 						controller.state.set(
// 							MockControllerStateKeys.CommunicationState,
// 							MockControllerCommunicationState.Sending,
// 						);

// 						// Notify the host that the message was sent
// 						const res = new SendDataResponse({
// 							wasSent: true,
// 						});
// 						await controller.sendMessageToHost(res);

// 						return true;
// 					} else if (msg instanceof SendDataAbort) {
// 						// Put the controller into idle state
// 						controller.state.set(
// 							MockControllerStateKeys.CommunicationState,
// 							MockControllerCommunicationState.Idle,
// 						);

// 						return true;
// 					}
// 				},
// 			};
// 			mockController.defineBehavior(handleBrokenSendData);

// 			const handleSoftReset: MockControllerBehavior = {
// 				onHostMessage(controller, msg) {
// 					// Soft reset should restore normal operation
// 					if (msg instanceof SoftResetRequest) {
// 						shouldTimeOut = false;
// 						// Delegate to the default behavior
// 						return false;
// 					}
// 				},
// 			};
// 			mockController.defineBehavior(handleSoftReset);
// 		},
// 		testBody: async (t, driver, node, mockController, mockNode) => {
// 			// Circumvent the options validation so the test doesn't take forever
// 			driver.options.timeouts.sendDataCallback = 1500;

// 			shouldTimeOut = true;

// 			const firstCommand = node.commandClasses.Basic.set(99);
// 			const followupCommand = node.commandClasses.Basic.set(0);

// 			await wait(2000);

// 			mockController.assertReceivedHostMessage(
// 				(msg) => msg.functionType === FunctionType.SendDataAbort,
// 			);
// 			mockController.clearReceivedHostMessages();

// 			// The stick should have been soft-reset
// 			await wait(1000);
// 			mockController.assertReceivedHostMessage(
// 				(msg) => msg.functionType === FunctionType.SoftReset,
// 			);

// 			// The ping and the followup command should eventually succeed
// 			await firstCommand;
// 			await followupCommand;

// 		// 		},
// 	},
// );

// integrationTest(
// 	"Missing callback recovery only kicks in for SendData commands",
// 	{
// 		// debug: true,

// 		additionalDriverOptions: {
// 			testingHooks: {
// 				skipNodeInterview: true,
// 			},
// 		},

// 		customSetup: async (driver, mockController, mockNode) => {
// 			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
// 			const handleBrokenRequestNodeInfo: MockControllerBehavior = {
// 				async onHostMessage(controller, msg) {
// 					if (msg instanceof RequestNodeInfoRequest) {
// 						// Notify the host that the message was sent
// 						const res = new RequestNodeInfoResponse({
// 							wasSent: true,
// 						});
// 						await controller.sendMessageToHost(res);

// 						// And never send a callback
// 						return true;
// 					}
// 				},
// 			};
// 			mockController.defineBehavior(handleBrokenRequestNodeInfo);
// 		},
// 		testBody: async (t, driver, node, mockController, mockNode) => {
// 			// Circumvent the options validation so the test doesn't take forever
// 			driver.options.timeouts.sendDataCallback = 1500;

// 			await assertZWaveError(t.expect, () => node.requestNodeInfo(), {
// 				errorCode: ZWaveErrorCodes.Controller_Timeout,
// 				context: "callback",
// 			});
// 		},
// 	},
// );
