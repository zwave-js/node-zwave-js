import { FunctionType } from "@zwave-js/serial";
import { type MockControllerBehavior } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import {
	MockControllerCommunicationState,
	MockControllerStateKeys,
} from "../../controller/MockControllerState";

import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import Sinon from "sinon";
import { SoftResetRequest } from "../../serialapi/misc/SoftResetRequest";
import {
	SendDataAbort,
	SendDataRequest,
	SendDataResponse,
} from "../../serialapi/transport/SendDataMessages";
import { integrationTest } from "../integrationTestSuite";

let shouldTimeOut: boolean;

integrationTest(
	"Abort transmission and soft-reset stick if SendData is missing the callback",
	{
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

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
			const handleBrokenSendData: MockControllerBehavior = {
				async onHostMessage(host, controller, msg) {
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse(host, {
							wasSent: true,
						});
						await controller.sendToHost(res.serialize());

						return true;
					} else if (msg instanceof SendDataAbort) {
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

			const handleSoftReset: MockControllerBehavior = {
				onHostMessage(host, controller, msg) {
					// Soft reset should restore normal operation
					if (msg instanceof SoftResetRequest) {
						shouldTimeOut = false;
						return true;
					}
				},
			};
			mockController.defineBehavior(handleSoftReset);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.sendDataCallback = 1500;

			shouldTimeOut = true;

			const pingPromise = node.ping();

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

			// And the ping should eventually succeed
			t.true(await pingPromise);
		},
	},
);

integrationTest(
	"Destroy driver if SendData is still missing the callback after soft-reset",
	{
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

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
			const handleBrokenSendData: MockControllerBehavior = {
				async onHostMessage(host, controller, msg) {
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse(host, {
							wasSent: true,
						});
						await controller.sendToHost(res.serialize());

						return true;
					} else if (msg instanceof SendDataAbort) {
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
			driver.options.timeouts.sendDataCallback = 1500;
			shouldTimeOut = true;

			const errorSpy = Sinon.spy();
			driver.on("error", errorSpy);

			const pingPromise = node.ping();

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

			// The ping should eventually fail
			t.false(await pingPromise);

			// The driver should have been destroyed
			await wait(100);
			assertZWaveError(t, errorSpy.getCall(0).args[0], {
				errorCode: ZWaveErrorCodes.Driver_Failed,
			});
		},
	},
);
