import {
	BasicCCSet,
	type CommandClass,
	Security2CCCommandsSupportedGet,
	Security2CCCommandsSupportedReport,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	TimeCCTimeGet,
	TimeCCTimeReport,
} from "@zwave-js/cc";
import { SPANState, SecurityClass, SecurityManager2 } from "@zwave-js/core";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"S2 encapsulated commands using a lower security class can be decoded",
	{
		// debug: true,

		// We need the cache to skip the CC interviews and mark S2 as supported
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/decodeLowerS2Keys",
		),

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const sm2Node = new SecurityManager2();
			// Copy keys from the driver
			sm2Node.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			sm2Node.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			sm2Node.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			mockNode.securityManagers.securityManager2 = sm2Node;
			// The fixtures define Access Control as granted, but we want the prode to send commands using Unauthenticated
			mockNode.encodingContext.getHighestSecurityClass = () =>
				SecurityClass.S2_Unauthenticated;

			// Create a security manager for the controller
			const smCtrlr = new SecurityManager2();
			// Copy keys from the driver
			smCtrlr.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			smCtrlr.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			smCtrlr.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			controller.securityManagers.securityManager2 = smCtrlr;
			controller.parsingContext.getHighestSecurityClass =
				controller.encodingContext.getHighestSecurityClass =
					() => SecurityClass.S2_Unauthenticated;

			// Respond to S2 Nonce Get
			const respondToS2NonceGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof Security2CCNonceGet) {
						const nonce = sm2Node.generateNonce(
							controller.ownNodeId,
						);
						const cc = new Security2CCNonceReport({
							nodeId: controller.ownNodeId,
							ownNodeId: self.id,
							securityManagers: self.securityManagers,
							SOS: true,
							MOS: false,
							receiverEI: nonce,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToS2NonceGet);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Simulate a situation where the node has requested the controller's nonce
			const controllerEI = randomBytes(16);
			driver.securityManager2!.setSPANState(mockNode.id, {
				type: SPANState.LocalEI,
				receiverEI: controllerEI,
			});
			mockNode.securityManagers.securityManager2!.setSPANState(
				mockController.ownNodeId,
				{
					type: SPANState.RemoteEI,
					receiverEI: controllerEI,
				},
			);

			// The node sends an S2-encapsulated command, but with a lower security class than expected
			let innerCC: CommandClass = new TimeCCTimeGet({
				nodeId: mockController.ownNodeId,
			});
			let cc = new Security2CCMessageEncapsulation({
				nodeId: mockController.ownNodeId,
				ownNodeId: mockNode.id,
				encapsulated: innerCC,
				securityManagers: mockNode.securityManagers,
			});

			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(200);

			// The controller should NOT have sent a NonceReport in response
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof Security2CCNonceReport,
				{
					noMatch: true,
				},
			);

			// And the controller should also NOT have answered it
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof Security2CCMessageEncapsulation
					&& f.payload.encapsulated instanceof TimeCCTimeReport,
				{
					noMatch: true,
				},
			);

			await wait(200);

			mockNode.clearReceivedControllerFrames();

			// Now the node queries our securely supported commands
			innerCC = new Security2CCCommandsSupportedGet({
				nodeId: mockController.ownNodeId,
			});

			cc = new Security2CCMessageEncapsulation({
				nodeId: mockController.ownNodeId,
				ownNodeId: mockNode.id,
				encapsulated: innerCC,
				securityManagers: mockNode.securityManagers,
			});

			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			await wait(500);

			// The controller should NOT have sent a NonceReport in response
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof Security2CCNonceReport,
				{
					noMatch: true,
				},
			);

			// It should have answered though
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof Security2CCMessageEncapsulation
					&& f.payload.encapsulated
						instanceof Security2CCCommandsSupportedReport
					&& f.payload.encapsulated.supportedCCs.length === 0,
			);

			await wait(200);

			// Sending a new command to the node MUST use the highest shared security class, even if there was a shared SPAN for a lower class
			mockNode.clearReceivedControllerFrames();
			await node.commandClasses.Basic.set(0xff);

			await wait(200);

			// The controller MUST have sent a NonceGet
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof Security2CCNonceGet,
			);
			// And the Basic Set with the sender EI
			mockNode.assertReceivedControllerFrame(
				(f) =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof Security2CCMessageEncapsulation
					&& f.payload.encapsulated instanceof BasicCCSet,
			);

			t.pass();
		},
	},
);
