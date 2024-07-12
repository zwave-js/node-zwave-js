import {
	SecurityCCCommandEncapsulation,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "@zwave-js/cc";
import { SecurityManager } from "@zwave-js/core";
import {
	MOCK_FRAME_ACK_TIMEOUT,
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"when a NonceReport does not get delivered, it does not block further nonce requests",
	{
		// debug: true,

		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeAsleepBlockNonceReport",
		),

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const sm0Node = new SecurityManager({
				ownNodeId: mockNode.id,
				networkKey: driver.options.securityKeys!.S0_Legacy!,
				nonceTimeout: 100000,
			});
			mockNode.host.securityManager = sm0Node;

			// Create a security manager for the controller
			const sm0Ctrlr = new SecurityManager({
				ownNodeId: controller.host.ownNodeId,
				networkKey: driver.options.securityKeys!.S0_Legacy!,
				nonceTimeout: 100000,
			});
			controller.host.securityManager = sm0Ctrlr;

			// Respond to S0 Nonce Get
			const respondToS0NonceGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof SecurityCCNonceGet) {
						const nonce = sm0Node.generateNonce(
							controller.host.ownNodeId,
							8,
						);
						const cc = new SecurityCCNonceReport(self.host, {
							nodeId: controller.host.ownNodeId,
							nonce,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToS0NonceGet);

			// Parse Security CC commands. This MUST be defined last, since defineBehavior will prepend it to the list
			const parseS0CC: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					// We don't support sequenced commands here
					if (
						receivedCC
							instanceof SecurityCCCommandEncapsulation
					) {
						receivedCC.mergePartialCCs(undefined as any, []);
					}
					// This just decodes - we need to call further handlers
					return undefined;
				},
			};
			mockNode.defineBehavior(parseS0CC);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// The node requests a nonce while asleep, but the ACK gets lost
			node.markAsAsleep();
			mockNode.autoAckControllerFrames = false;

			let nonceRequest = new SecurityCCNonceGet(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(nonceRequest, {
					ackRequested: false,
				}),
			);

			// The driver should send a Nonce Report command
			await wait(200);
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof SecurityCCNonceReport,
				{
					errorMessage: "Expected a Nonce Report to be sent",
				},
			);

			mockNode.clearReceivedControllerFrames();
			await wait(MOCK_FRAME_ACK_TIMEOUT);

			// No further Nonce Report should have been sent
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof SecurityCCNonceReport,
				{
					noMatch: true,
					errorMessage: "Expected NO further Nonce Report to be sent",
				},
			);

			// The node's ACK will now be received again
			mockNode.autoAckControllerFrames = true;

			// And subsequent requests must be answered
			nonceRequest = new SecurityCCNonceGet(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(nonceRequest, {
					ackRequested: false,
				}),
			);

			await wait(200);
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof SecurityCCNonceReport,
				{
					errorMessage: "Expected a Nonce Report to be sent",
				},
			);

			t.pass();
		},
	},
);
