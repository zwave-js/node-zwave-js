import {
	BasicCCGet,
	type CommandClass,
	NoOperationCC,
	WakeUpCCWakeUpNotification,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuiteMulti";

// Repro from #1107
// Node 10's awake timer elapses before its ping is rejected,
// this causes mismatched responses for all following messages

integrationTest(
	"marking a node with a pending message as asleep does not mess up the remaining transactions",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeAsleepMessageOrder",
		),

		nodeCapabilities: [
			{
				id: 10,
				capabilities: {
					commandClasses: [
						CommandClasses.Basic,
						CommandClasses["Wake Up"],
					],
					isListening: false,
					isFrequentListening: false,
				},
			},
			{
				id: 17,
				capabilities: {
					commandClasses: [CommandClasses.Basic],
				},
			},
		],

		testBody: async (t, driver, nodes, mockController, mockNodes) => {
			const [node10, node17] = nodes;
			const [mockNode10, mockNode17] = mockNodes;

			node10.markAsAwake();
			mockNode10.autoAckControllerFrames = false;
			mockNode17.autoAckControllerFrames = false;

			const pingPromise10 = node10.ping();
			node10.commandClasses.Basic.set(60);
			const pingPromise17 = node17.ping();

			// Ping for 10 should be sent
			await wait(50);
			mockNode10.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof NoOperationCC,
				{
					errorMessage: "Node 10 did not receive the ping",
				},
			);

			// Mark the node as asleep. This should abort the ongoing transaction.
			node10.markAsAsleep();
			await wait(50);

			mockController.assertReceivedHostMessage(
				(msg) => msg.functionType === FunctionType.SendDataAbort,
				{
					errorMessage: "The SendData was not aborted",
				},
			);

			// Now ack the ping so the SendData command will be finished
			mockNode10.ackControllerRequestFrame();

			// Ping for 10 should be failed now
			t.false(await pingPromise10);

			// Now the ping for 17 should go out
			await wait(500);
			mockNode17.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof NoOperationCC,
				{
					errorMessage: "Node 17 did not receive the ping",
				},
			);

			// Ping 17 does not get resolved by the other callback
			t.is(await Promise.race([pingPromise17, wait(50)]), undefined);

			// And it should fail since we don't ack:
			t.false(await pingPromise17);
		},
	},
);

integrationTest(
	"When a sleeping node with pending commands wakes up, the queue continues executing",
	{
		// debug: true,

		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeAsleepMessageOrder",
		),

		nodeCapabilities: [
			{
				id: 10,
				capabilities: {
					commandClasses: [
						CommandClasses.Basic,
						CommandClasses["Wake Up"],
					],
					isListening: false,
					isFrequentListening: false,
				},
			},
			{
				id: 17,
				capabilities: {
					commandClasses: [CommandClasses.Basic],
				},
			},
		],

		customSetup: async (driver, mockController, mockNodes) => {
			const [mockNode10] = mockNodes;

			const doNotAnswerWhenAsleep: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (!mockNode10.autoAckControllerFrames) {
						return { action: "stop" };
					}
				},
			};
			mockNode10.defineBehavior(doNotAnswerWhenAsleep);
		},

		testBody: async (t, driver, nodes, mockController, mockNodes) => {
			const [node10, node17] = nodes;
			const [mockNode10, mockNode17] = mockNodes;

			// Node 10 is assumed to be awake, but actually asleep
			node10.markAsAwake();
			mockNode10.autoAckControllerFrames = false;

			// Query the node's BASIC state. This will fail and move the commands to the wakeup queue.
			const queryBasicPromise1 = node10.commandClasses.Basic.get();

			// Wait for the node to get marked as asleep
			await new Promise((resolve) => node10.once("sleep", resolve));

			driver.driverLog.sendQueue(driver["queue"]);

			await wait(200);

			// Node 10 wakes up
			mockNode10.autoAckControllerFrames = true;
			const cc: CommandClass = new WakeUpCCWakeUpNotification(
				mockNode10.host,
				{
					nodeId: mockController.host.ownNodeId,
				},
			);
			mockNode10.sendToController(createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}));

			// Wait for the node to wake up
			mockNode10.clearReceivedControllerFrames();
			await new Promise((resolve) => node10.once("wake up", resolve));

			driver.driverLog.print("AFTER WAKEUP:");
			driver.driverLog.sendQueue(driver["queue"]);

			let result: any = await Promise.race([
				wait(5000).then(() => "timeout"),
				queryBasicPromise1.catch(() => "error"),
			]);
			// The first command should have been sent
			mockNode10.assertReceivedControllerFrame((f) =>
				f.type === MockZWaveFrameType.Request
				&& f.payload instanceof BasicCCGet
			);
			// and return a number
			t.is(typeof result?.currentValue, "number");

			// Query the node's BASIC state again. This should be handled relatively quickly
			mockNode10.clearReceivedControllerFrames();
			const queryBasicPromise2 = node10.commandClasses.Basic.get();

			await wait(500);

			driver.driverLog.print("AFTER Basic Get:");
			driver.driverLog.sendQueue(driver["queue"]);

			result = await Promise.race([
				wait(5000).then(() => "timeout"),
				queryBasicPromise2.catch(() => "error"),
			]);

			// The second command should also have been sent
			mockNode10.assertReceivedControllerFrame((f) =>
				f.type === MockZWaveFrameType.Request
				&& f.payload instanceof BasicCCGet
			);
			// and return a number
			t.is(typeof result?.currentValue, "number");
		},
	},
);

integrationTest(
	"When a command to a sleeping node is pending, other commands are still handled",
	{
		// debug: true,

		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeAsleepMessageOrder",
		),

		nodeCapabilities: [
			{
				id: 10,
				capabilities: {
					commandClasses: [
						CommandClasses.Basic,
						CommandClasses["Wake Up"],
					],
					isListening: false,
					isFrequentListening: false,
				},
			},
			{
				id: 17,
				capabilities: {
					commandClasses: [CommandClasses.Basic],
				},
			},
		],

		customSetup: async (driver, mockController, mockNodes) => {
			const [mockNode10] = mockNodes;

			const doNotAnswerWhenAsleep: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (!mockNode10.autoAckControllerFrames) {
						return { action: "stop" };
					}
				},
			};
			mockNode10.defineBehavior(doNotAnswerWhenAsleep);
		},

		testBody: async (t, driver, nodes, mockController, mockNodes) => {
			const [node10, node17] = nodes;
			const [mockNode10, mockNode17] = mockNodes;

			// Node 10 is sleeping
			node10.markAsAsleep();
			mockNode10.autoAckControllerFrames = false;

			// Queue a command to node 10
			const commandToNode10 = node10.commandClasses.Basic.set(60);

			// Queue a command to node 17
			const commandToNode17 = node17.commandClasses.Basic.set(99);

			driver.driverLog.print("BEFORE wakeup");
			driver.driverLog.sendQueue(driver["queue"]);

			let result = await Promise.race([
				wait(500).then(() => "timeout"),
				commandToNode17.then(() => "ok"),
			]);
			t.is(result, "ok");

			// The first command should not have been sent
			mockNode10.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof BasicCCGet,
				{
					noMatch: true,
				},
			);

			driver.driverLog.print("AFTER first command");
			driver.driverLog.sendQueue(driver["queue"]);

			// Node 10 wakes up
			mockNode10.autoAckControllerFrames = true;
			const cc: CommandClass = new WakeUpCCWakeUpNotification(
				mockNode10.host,
				{
					nodeId: mockController.host.ownNodeId,
				},
			);
			mockNode10.sendToController(createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}));

			// And the first command should be sent
			result = await Promise.race([
				wait(500).then(() => "timeout"),
				commandToNode10.then(() => "ok"),
			]);
			t.is(result, "ok");
		},
	},
);
