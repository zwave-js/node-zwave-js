import { BinarySwitchCCValues } from "@zwave-js/cc/BinarySwitchCC";
import { CommandClasses, TransactionState } from "@zwave-js/core";
import sinon from "sinon";

import { getEnumMemberName } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"The progress listener passed to sendCommand gets called with status updates",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Binary Switch"],
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const onProgress = sinon.stub().callsFake((progress) => {
				driver.driverLog.print(
					`onProgress: ${
						getEnumMemberName(TransactionState, progress.state)
					}`,
				);
			});

			await node.setValue(BinarySwitchCCValues.targetValue.id, true, {
				onProgress,
			});

			sinon.assert.calledWith(onProgress, {
				state: TransactionState.Queued,
			});

			sinon.assert.calledWith(onProgress, {
				state: TransactionState.Active,
			});
			sinon.assert.calledWith(onProgress, {
				state: TransactionState.Completed,
			});

			t.pass();
		},
	},
);

integrationTest(
	"Communication with sleeping nodes is considered correctly",
	{
		// debug: true,

		provisioningDirectory: path.join(
			__dirname,
			"fixtures/binarySwitchSleeping",
		),

		// nodeCapabilities: {
		// 	isListening: false,
		// 	isFrequentListening: false,
		// 	commandClasses: [
		// 		CommandClasses.Version,
		// 		CommandClasses["Binary Switch"],
		// 	],
		// },

		testBody: async (t, driver, node, mockController, mockNode) => {
			const states: TransactionState[] = [];
			const onProgress = sinon.stub().callsFake((progress) => {
				driver.driverLog.print(
					`onProgress: ${
						getEnumMemberName(TransactionState, progress.state)
					}`,
				);
				states.push(progress.state);
			});

			// Node is asleep, but assumed to be awake
			mockNode.autoAckControllerFrames = false;
			node.markAsAwake();
			const promise = node.setValue(
				BinarySwitchCCValues.targetValue.id,
				true,
				{
					onProgress,
				},
			);

			// Wait for the node to get marked asleep again
			await new Promise((resolve) => {
				node.once("sleep", resolve);
			});

			await wait(200);

			t.deepEqual(states, [
				TransactionState.Queued,
				TransactionState.Active,
				TransactionState.Queued,
			]);

			// Now the node is awake again
			mockNode.autoAckControllerFrames = true;
			node.markAsAwake();

			await promise;

			await wait(200);
		
			t.deepEqual(states, [
				TransactionState.Queued,
				TransactionState.Active,
				TransactionState.Queued,
				TransactionState.Active,
				TransactionState.Completed,
			]);
		},
	},
);
