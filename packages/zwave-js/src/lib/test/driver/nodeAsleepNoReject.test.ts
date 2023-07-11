import { BasicCCGet, BasicCCSet } from "@zwave-js/cc";
import { MessagePriority, NodeStatus } from "@zwave-js/core";
import { MOCK_FRAME_ACK_TIMEOUT, MockZWaveFrameType } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { type SendDataRequest } from "../../serialapi/transport/SendDataMessages";
import { integrationTest } from "../integrationTestSuite";

// Repro from #1078

integrationTest(
	"when a node does not respond because it is asleep, the transaction does not get rejected",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeAsleepNoReject",
		),

		testBody: async (t, driver, node2, mockController, mockNode) => {
			node2.markAsAwake();
			mockNode.autoAckControllerFrames = false;

			t.is(node2.status, NodeStatus.Awake);

			const command1 = new BasicCCSet(driver, {
				nodeId: 2,
				targetValue: 99,
			});
			const basicSetPromise1 = driver.sendCommand(command1, {
				maxSendAttempts: 1,
			});

			const command2 = new BasicCCGet(driver, {
				nodeId: 2,
			});
			driver.sendCommand(command2, {
				maxSendAttempts: 1,
			});

			// The node should have received the first command
			await wait(50);
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof BasicCCSet &&
					frame.payload.targetValue === 99,
				{
					errorMessage: "The first command was not received",
				},
			);

			// The command fails due to no ACK, ...
			t.is(
				await Promise.race([
					basicSetPromise1,
					wait(MOCK_FRAME_ACK_TIMEOUT + 100).then(() => "timeout"),
				]),
				"timeout",
			);

			// ...but both should still be in the queue
			const sendQueue = driver["queue"];
			driver.driverLog.sendQueue(sendQueue);
			t.is(sendQueue.length, 2);
			t.is(sendQueue.get(0)?.priority, MessagePriority.WakeUp);
			t.is(sendQueue.get(1)?.priority, MessagePriority.WakeUp);
			t.is(node2.status, NodeStatus.Asleep);

			// And the order should be correct
			t.is(
				(
					(sendQueue.get(0)?.message as SendDataRequest)
						.command as BasicCCSet
				).targetValue,
				99,
			);
			t.true(
				(sendQueue.get(1)?.message as SendDataRequest)
					.command instanceof BasicCCGet,
			);
		},
	},
);
