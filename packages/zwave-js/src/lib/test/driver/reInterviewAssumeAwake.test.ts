import { WakeUpCCWakeUpNotification } from "@zwave-js/cc";
import { CommandClasses, InterviewStage } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest("Assume a node to be awake at the start of a re-interview", {
	debug: true,

	nodeCapabilities: {
		isListening: false,
		isFrequentListening: false,

		commandClasses: [
			{
				ccId: CommandClasses["Wake Up"],
				version: 1,
				isSupported: true,
			},
		],
	},

	customSetup(driver, mockController, mockNode) {
		driver.on("driver ready", async () => {
			await wait(100);

			// Send a WakeUpNotification to the node to trigger the interview
			const cc = new WakeUpCCWakeUpNotification(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
		});
		return Promise.resolve();
	},

	testBody: async (driver, node, mockController, mockNode) => {
		// Wait for the assignReturnRoute command to be completed
		await wait(500);
		node.markAsAsleep();

		// After the interview, do a re-interview
		void node.refreshInfo({
			waitForWakeup: true,
		});

		const cc = new WakeUpCCWakeUpNotification(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(cc, {
				ackRequested: false,
			}),
		);
		// This should not hang since the node just sent a wakeup notification
		await wait(1000);
		expect(node.interviewStage).not.toBe(InterviewStage.ProtocolInfo);
	},
});
