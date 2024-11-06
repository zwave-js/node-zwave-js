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
	CommandClasses,
	MessagePriority,
	NodeStatus,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import {
	SerialAPIStartedRequest,
	SerialAPIWakeUpReason,
} from "@zwave-js/serial/serialapi";
import { SoftResetRequest } from "@zwave-js/serial/serialapi";
import {
	RequestNodeInfoRequest,
	RequestNodeInfoResponse,
} from "@zwave-js/serial/serialapi";
import {
	SendDataAbort,
	SendDataRequest,
	SendDataResponse,
} from "@zwave-js/serial/serialapi";
import path from "node:path";
import Sinon from "sinon";
import { determineNIF } from "../../controller/NodeInformationFrame.js";
import { integrationTest } from "../integrationTestSuite.js";
import { integrationTest as integrationTestMulti } from "../integrationTestSuiteMulti.js";

let shouldTimeOut: boolean;

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
	"Abort transmission and soft-reset stick if SendData is missing the callback",
	{
		// debug: true,

		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		controllerCapabilities: controllerCapabilitiesNoBridge,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

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
				onHostMessage(controller, msg) {
					// Soft reset should restore normal operation
					if (msg instanceof SoftResetRequest) {
						shouldTimeOut = false;
						// Delegate to the default behavior
						return false;
					}
				},
			};
			mockController.defineBehavior(handleSoftReset);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.sendDataAbort = 1000;
			driver.options.timeouts.sendDataCallback = 1500;

			shouldTimeOut = true;

			const pingPromise = node.ping();

			await wait(2000);

			// The abort should have been issued
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
			);

			// And the stick should have been soft-reset
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SoftReset,
			);

			// And the ping should eventually succeed
			t.expect(await pingPromise).toBe(true);
		},
	},
);

integrationTest(
	"Mark node as dead if SendData is still missing the callback after soft-reset",
	{
		// Real-world experience has shown that for older controllers this situation can be caused by dead nodes
		// We don't want to restart the driver in that case, but mark the node as dead instead
		// debug: true,

		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		controllerCapabilities: controllerCapabilitiesNoBridge,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
			const handleBrokenSendData: MockControllerBehavior = {
				async onHostMessage(controller, msg) {
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
						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

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
			driver.options.timeouts.sendDataAbort = 1000;
			driver.options.timeouts.sendDataCallback = 1500;
			shouldTimeOut = true;

			const errorSpy = Sinon.spy();
			driver.on("error", errorSpy);

			const pingPromise = node.ping();

			await wait(2000);

			// The abort should have been issued
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
			);

			// And the stick should have been soft-reset
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SoftReset,
			);

			// The ping should eventually fail and the node be marked dead
			t.expect(await pingPromise).toBe(false);

			t.expect(node.status).toBe(NodeStatus.Dead);

			// The error event should not have been emitted
			await wait(300);
			t.expect(errorSpy.callCount).toBe(0);
		},
	},
);

integrationTest(
	"Missing callback recovery works if the command can be retried",
	{
		// debug: true,

		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		controllerCapabilities: controllerCapabilitiesNoBridge,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

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
				onHostMessage(controller, msg) {
					// Soft reset should restore normal operation
					if (msg instanceof SoftResetRequest) {
						shouldTimeOut = false;
						// Delegate to the default behavior
						return false;
					}
				},
			};
			mockController.defineBehavior(handleSoftReset);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.sendDataAbort = 1000;
			driver.options.timeouts.sendDataCallback = 1500;

			shouldTimeOut = true;

			const firstCommand = node.commandClasses.Basic.set(99);
			const followupCommand = node.commandClasses.Basic.set(0);

			await wait(2000);

			// The abort should have been issued
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
			);

			// And the stick should have been soft-reset
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SoftReset,
			);

			// The ping and the followup command should eventually succeed
			await firstCommand;
			await followupCommand;
		},
	},
);

integrationTest(
	"Missing callback recovery only kicks in for SendData commands",
	{
		// debug: true,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
			const handleBrokenRequestNodeInfo: MockControllerBehavior = {
				async onHostMessage(controller, msg) {
					if (msg instanceof RequestNodeInfoRequest) {
						// Notify the host that the message was sent
						const res = new RequestNodeInfoResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

						// And never send a callback
						return true;
					}
				},
			};
			mockController.defineBehavior(handleBrokenRequestNodeInfo);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.sendDataAbort = 1000;
			driver.options.timeouts.sendDataCallback = 1500;

			await assertZWaveError(t.expect, () => node.requestNodeInfo(), {
				errorCode: ZWaveErrorCodes.Controller_Timeout,
				context: "callback",
			});
		},
	},
);

integrationTest(
	"With soft-reset disabled, transmissions do not get stuck after a missing Send Data callback",
	{
		// debug: true,

		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		controllerCapabilities: {
			...controllerCapabilitiesNoBridge,
			// Soft-reset cannot be disabled on 700+ series
			libraryVersion: "Z-Wave 6.84.0",
		},

		additionalDriverOptions: {
			features: {
				softReset: false,
			},
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

						return true;
					} else if (msg instanceof SendDataAbort) {
						// Put the controller into idle state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Idle,
						);

						// We only timeout once in this test
						shouldTimeOut = false;

						return true;
					}
				},
			};
			mockController.defineBehavior(handleBrokenSendData);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.sendDataAbort = 1000;
			driver.options.timeouts.sendDataCallback = 1500;

			shouldTimeOut = true;

			const firstCommand = node.commandClasses.Basic.set(99).catch((e) =>
				e.code
			);
			const followupCommand = node.commandClasses.Basic.set(0);

			await wait(2500);

			// Transmission should have been aborted
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
			);
			// but the stick should NOT have been soft-reset
			t.expect(() =>
				mockController.assertReceivedHostMessage(
					(msg) => msg.functionType === FunctionType.SoftReset,
				)
			).toThrow();
			mockController.clearReceivedHostMessages();

			// The first command should be failed
			t.expect(await firstCommand).toBe(
				ZWaveErrorCodes.Controller_Timeout,
			);

			// The followup command should eventually succeed
			await followupCommand;
		},
	},
);

integrationTest(
	"After a missing Send Data callback, Send Data Abort is not executed twice",
	{
		// debug: true,

		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		controllerCapabilities: {
			...controllerCapabilitiesNoBridge,
			// Soft-reset cannot be disabled on 700+ series
			libraryVersion: "Z-Wave 6.84.0",
		},

		additionalDriverOptions: {
			features: {
				softReset: false,
			},
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

						return true;
					} else if (msg instanceof SendDataAbort) {
						// Put the controller into idle state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Idle,
						);

						// We only timeout once in this test
						shouldTimeOut = false;

						return true;
					}
				},
			};
			mockController.defineBehavior(handleBrokenSendData);
		},
		testBody: async (t, driver, node, mockController, mockNode) => {
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.sendDataAbort = 1000;
			driver.options.timeouts.sendDataCallback = 1500;

			shouldTimeOut = true;

			await assertZWaveError(
				t.expect,
				() => node.commandClasses.Basic.set(99),
				{
					errorCode: ZWaveErrorCodes.Controller_Timeout,
					context: "callback",
				},
			);

			const aborts = mockController.receivedHostMessages.filter((m) =>
				m.functionType === FunctionType.SendDataAbort
			);
			t.expect(aborts.length).toBe(1);
		},
	},
);

integrationTestMulti(
	"When a command from the immediate queue to a sleeping node triggers the unresponsive controller recovery, the normal send queue does not get blocked",
	{
		// debug: true,

		provisioningDirectory: path.join(
			__dirname,
			"fixtures/sendDataMissingCallbackImmediateToSleepingNode",
		),

		controllerCapabilities: controllerCapabilitiesNoBridge,

		nodeCapabilities: [
			{
				id: 2,
				capabilities: {
					// isFrequentListening: false,
					isListening: false,
					commandClasses: [
						CommandClasses["Wake Up"],
						CommandClasses.Basic,
					],
				},
			},
			{
				id: 3,
				capabilities: {
					commandClasses: [
						CommandClasses.Basic,
					],
				},
			},
		],

		// additionalDriverOptions: {
		// 	testingHooks: {
		// 		skipNodeInterview: true,
		// 	},
		// },

		customSetup: async (driver, mockController, mockNodes) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

						return true;
					} else if (msg instanceof SendDataAbort) {
						// Put the controller into idle state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Idle,
						);

						shouldTimeOut = false;

						return true;
					}
				},
			};
			mockController.defineBehavior(handleBrokenSendData);
		},
		testBody: async (t, driver, nodes, mockController, mockNodes) => {
			driver.driverLog.print("TEST START");
			// Circumvent the options validation so the test doesn't take forever
			driver.options.timeouts.sendDataAbort = 1000;
			driver.options.timeouts.sendDataCallback = 1500;

			shouldTimeOut = true;
			const [node2, node3] = nodes;

			node2.markAsAsleep();
			node3.markAsAlive();

			const immediateCommand = node2.commandClasses.Basic.withOptions({
				priority: MessagePriority.Immediate,
			}).set(0).catch((e) => e.code);

			await wait(2500);

			// Transmission should have been aborted
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
			);
			// And the stick should have been soft-reset
			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SoftReset,
			);
			mockController.clearReceivedHostMessages();

			const followupCommand = node3.commandClasses.Basic.set(0).catch((
				e,
			) => e.code);

			// Both commands should succeed now.

			driver.driverLog.print("normal queue");
			driver.driverLog.sendQueue(driver["queue"]);
			driver.driverLog.print("immediate queue:");
			driver.driverLog.sendQueue(driver["immediateQueue"]);

			await immediateCommand;
			await followupCommand;
		},
	},
);

integrationTest(
	"Retry transmissions if the controller is reset by the watchdog while waiting for the callback",
	{
		// debug: true,

		// provisioningDirectory: path.join(
		// 	__dirname,
		// 	"__fixtures/supervision_binary_switch",
		// ),

		controllerCapabilities: controllerCapabilitiesNoBridge,

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		customSetup: async (driver, mockController, mockNode) => {
			// This is almost a 1:1 copy of the default behavior, except that the callback never gets sent
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

						// Put the controller into sending state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Sending,
						);

						// Notify the host that the message was sent
						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

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
			driver.options.timeouts.sendDataAbort = 1500;
			driver.options.timeouts.sendDataCallback = 2000;

			shouldTimeOut = true;

			const pingPromise = node.ping();

			await wait(1000);

			// After 1 second, the watchdog restarts the controller
			shouldTimeOut = false;

			mockController.state.set(
				MockControllerStateKeys.CommunicationState,
				MockControllerCommunicationState.Idle,
			);

			const ret = new SerialAPIStartedRequest({
				wakeUpReason: SerialAPIWakeUpReason.WatchdogReset,
				watchdogEnabled: true,
				isListening: true,
				...determineNIF(),
				supportsLongRange: true,
			});
			setImmediate(async () => {
				await mockController.sendMessageToHost(ret);
			});

			// And the ping should eventually succeed
			t.expect(await pingPromise).toBe(true);

			// But the transmission should not have been aborted
			t.expect(() =>
				mockController.assertReceivedHostMessage(
					(msg) => msg.functionType === FunctionType.SendDataAbort,
				)
			).toThrow();
		},
	},
);
