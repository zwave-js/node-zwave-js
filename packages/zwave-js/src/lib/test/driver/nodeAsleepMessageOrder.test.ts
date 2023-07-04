import { NoOperationCC } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import { MockZWaveFrameType } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuiteMulti";

// Repro from #1107
// Node 10's awake timer elapses before its ping is rejected,
// this causes mismatched responses for all following messages

integrationTest(
	"marking a node with a pending message as asleep does not mess up the remaining transactions",
	{
		debug: true,
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
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof NoOperationCC,
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
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof NoOperationCC,
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
