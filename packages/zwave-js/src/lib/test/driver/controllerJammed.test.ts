import {
	ControllerStatus,
	NodeStatus,
	TransmitStatus,
	ZWaveErrorCodes,
	assertZWaveError,
	getZWaveChipType,
} from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import { SoftResetRequest } from "@zwave-js/serial/serialapi";
import {
	SendDataAbort,
	SendDataRequest,
	SendDataRequestTransmitReport,
	SendDataResponse,
} from "@zwave-js/serial/serialapi";
import { type MockControllerBehavior } from "@zwave-js/testing";
import { setTimeout as wait } from "node:timers/promises";
import sinon from "sinon";
import {
	MockControllerCommunicationState,
	MockControllerStateKeys,
} from "../../controller/MockControllerState";
import { integrationTest } from "../integrationTestSuite";
import { integrationTest as integrationTestMulti } from "../integrationTestSuiteMulti";

let shouldFail = false;

integrationTest("update the controller status and wait if TX status is Fail", {
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
		// Return a TX status of Fail when desired
		const handleSendData: MockControllerBehavior = {
			async onHostMessage(controller, msg) {
				if (msg instanceof SendDataRequest) {
					if (!shouldFail) {
						// Defer to the default behavior
						return false;
					}

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

					await wait(100);

					controller.state.set(
						MockControllerStateKeys.CommunicationState,
						MockControllerCommunicationState.Idle,
					);

					const cb = new SendDataRequestTransmitReport({
						callbackId: msg.callbackId!,
						transmitStatus: TransmitStatus.Fail,
						txReport: {
							txTicks: 0,
							routeSpeed: 0 as any,
							routingAttempts: 0,
							ackRSSI: 0,
						},
					});
					await controller.sendMessageToHost(cb);

					return true;
				} else if (msg instanceof SendDataAbort) {
					// Put the controller into idle state
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
		node.markAsAlive();

		const statusChanges: ControllerStatus[] = [];
		driver.controller.on("status changed", (status) => {
			statusChanges.push(status);
		});

		const nodeDead = sinon.spy();
		node.on("dead", nodeDead);

		shouldFail = true;
		const promise = node.ping();
		await wait(500);

		// The controller should now be jammed, but the node's status must not change
		t.is(driver.controller.status, ControllerStatus.Jammed);
		t.is(node.status, NodeStatus.Alive);

		setTimeout(() => {
			shouldFail = false;
		}, 2000);

		await promise;

		t.is(driver.controller.status, ControllerStatus.Ready);
		t.is(node.status, NodeStatus.Alive);

		sinon.assert.notCalled(nodeDead);
		t.deepEqual(statusChanges, [
			ControllerStatus.Jammed,
			ControllerStatus.Ready,
		]);
	},
});

integrationTest(
	"When sending fails continuously, soft-reset to recover",
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

		customSetup: async (driver, controller, mockNode) => {
			// Return a TX status of Fail when desired
			const handleSendData: MockControllerBehavior = {
				async onHostMessage(controller, msg) {
					// Soft reset should restore normal operation
					if (msg instanceof SoftResetRequest) {
						shouldFail = false;

						// Call the original handler
						return false;
					} else if (msg instanceof SendDataRequest) {
						if (!shouldFail) {
							// Defer to the default behavior
							return false;
						}

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

						await wait(100);

						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Idle,
						);

						const cb = new SendDataRequestTransmitReport({
							callbackId: msg.callbackId!,
							transmitStatus: TransmitStatus.Fail,
							txReport: {
								txTicks: 0,
								routeSpeed: 0 as any,
								routingAttempts: 0,
								ackRSSI: 0,
							},
						});
						await controller.sendMessageToHost(cb);

						return true;
					} else if (msg instanceof SendDataAbort) {
						// Put the controller into idle state
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
			node.markAsAlive();

			const statusChanges: ControllerStatus[] = [];
			driver.controller.on("status changed", (status) => {
				statusChanges.push(status);
			});

			const nodeDead = sinon.spy();
			node.on("dead", nodeDead);

			shouldFail = true;
			const promise = node.ping();
			await wait(500);

			// The controller should now be jammed, but the node's status must not change
			t.is(driver.controller.status, ControllerStatus.Jammed);
			t.is(node.status, NodeStatus.Alive);

			// After soft-resetting (done automatically), the controller should be sending normally again
			await promise;
			// And the controller should have been soft-reset
			mockController.assertReceivedHostMessage((msg) =>
				msg.functionType === FunctionType.SoftReset
			);

			t.is(driver.controller.status, ControllerStatus.Ready);
			t.is(node.status, NodeStatus.Alive);

			sinon.assert.notCalled(nodeDead);
			t.deepEqual(statusChanges, [
				ControllerStatus.Jammed,
				ControllerStatus.Ready,
			]);
		},
	},
);

integrationTestMulti(
	"Prevent an infinite loop when the controller is unable to transmit a command to a specific node",
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

		controllerCapabilities: {
			// 500 series controller, where the soft-reset workaround does not make sense
			libraryVersion: "Z-Wave 6.84",
			zwaveChipType: getZWaveChipType(0x05, 0x00),
		},

		nodeCapabilities: [
			{
				id: 2,
				capabilities: {
					isListening: true,
				},
			},
			{
				id: 3,
				capabilities: {
					isListening: true,
				},
			},
		],

		customSetup: async (driver, controller, mockNodes) => {
			// Return a TX status of Fail when desired
			const handleSendData: MockControllerBehavior = {
				async onHostMessage(controller, msg) {
					if (msg instanceof SendDataRequest) {
						// Commands to node 3 work normally
						if (msg.getNodeId() === 3) {
							// Defer to the default behavior
							return false;
						}

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

						await wait(100);

						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Idle,
						);

						const cb = new SendDataRequestTransmitReport({
							callbackId: msg.callbackId!,
							transmitStatus: TransmitStatus.Fail,
							txReport: {
								txTicks: 0,
								routeSpeed: 0 as any,
								routingAttempts: 0,
								ackRSSI: 0,
							},
						});
						await controller.sendMessageToHost(cb);

						return true;
					} else if (msg instanceof SendDataAbort) {
						// Put the controller into idle state
						controller.state.set(
							MockControllerStateKeys.CommunicationState,
							MockControllerCommunicationState.Idle,
						);
					}
				},
			};
			controller.defineBehavior(handleSendData);
		},
		testBody: async (t, driver, nodes, mockController, mockNodes) => {
			const [node2, node3] = nodes;
			node2.markAsAlive();
			node3.markAsAlive();

			driver.options.timeouts.retryJammed = 100;

			// Commands to node 2 will fail forever
			await assertZWaveError(
				t,
				() => node2.commandClasses.Basic.set(99),
				{
					errorCode: ZWaveErrorCodes.Controller_MessageDropped,
				},
			);

			// But commands to node 3 should still continue afterwards
			t.true(await node3.ping());
		},
	},
);
