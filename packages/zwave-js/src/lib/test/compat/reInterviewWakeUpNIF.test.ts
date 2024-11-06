import { ZWaveProtocolCCNodeInformationFrame } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"Re-interviews that wait for a wake-up start when receiving a NIF",
	{
		// debug: true,

		provisioningDirectory: path.join(
			__dirname,
			"fixtures/reInterviewWakeUpNIF",
		),

		nodeCapabilities: {
			isFrequentListening: false,
			isListening: false,

			commandClasses: [
				CommandClasses["Wake Up"],
				CommandClasses.Version,
			],
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const promise = node.refreshInfo();

			await wait(500);

			// Send a NIF to trigger the re-interview
			const cc = new ZWaveProtocolCCNodeInformationFrame({
				nodeId: mockNode.id,
				...mockNode.capabilities,
				supportedCCs: [...mockNode.implementedCCs]
					.filter(([, info]) => info.isSupported)
					.map(([ccId]) => ccId),
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// The interview should now happen
			await promise;

			await wait(500);
		},
	},
);
