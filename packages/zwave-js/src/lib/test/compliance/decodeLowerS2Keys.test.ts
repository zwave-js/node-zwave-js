import {
	BasicCCSet,
	Security2CCMessageEncapsulation,
	Security2CCNonceReport,
} from "@zwave-js/cc";
import { SPANState, SecurityClass, SecurityManager2 } from "@zwave-js/core";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { randomBytes } from "crypto";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"S2 encapsulated commands using a lower security class can be decoded",
	{
		debug: true,

		// We need the cache to skip the CC interviews and mark S2 as supported
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/decodeLowerS2Keys",
		),

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const sm2Node = new SecurityManager2();
			// The fixtures define Access Control as granted, but we want the node to send the command using Unauthenticated
			// Copy keys from the driver
			sm2Node.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			mockNode.host.securityManager2 = sm2Node;
			// The node thinks it must send the command using S2 Unauthenticated
			mockNode.host.getHighestSecurityClass = () =>
				SecurityClass.S2_Unauthenticated;

			// // Create a security manager for the controller
			// const smCtrlr = new SecurityManager2();
			// // Copy keys from the driver
			// smCtrlr.setKey(
			// 	SecurityClass.S2_AccessControl,
			// 	driver.options.securityKeys!.S2_AccessControl!,
			// );
			// smCtrlr.setKey(
			// 	SecurityClass.S2_Authenticated,
			// 	driver.options.securityKeys!.S2_Authenticated!,
			// );
			// smCtrlr.setKey(
			// 	SecurityClass.S2_Unauthenticated,
			// 	driver.options.securityKeys!.S2_Unauthenticated!,
			// );
			// controller.host.securityManager2 = smCtrlr;
			// // The controller thinks that the node has the Access Control class
			// controller.host.getHighestSecurityClass = () =>
			// 	SecurityClass.S2_AccessControl;

			// const sm0Ctrlr = new SecurityManager({
			// 	ownNodeId: controller.host.ownNodeId,
			// 	networkKey: driver.options.securityKeys!.S0_Legacy!,
			// 	nonceTimeout: 100000,
			// });
			// controller.host.securityManager = sm0Ctrlr;
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Simulate a situation where the node has requested the controller's nonce
			const controllerEI = randomBytes(16);
			driver.securityManager2!.setSPANState(mockNode.id, {
				type: SPANState.LocalEI,
				receiverEI: controllerEI,
			});
			mockNode.host.securityManager2!.setSPANState(
				mockController.host.ownNodeId,
				{
					type: SPANState.RemoteEI,
					receiverEI: controllerEI,
				},
			);

			// The node sends an S2-encapsulated command, but with a lower security class than expected
			const innerCC = new BasicCCSet(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				targetValue: 0,
			});
			const cc = new Security2CCMessageEncapsulation(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				encapsulated: innerCC,
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
					f.type === MockZWaveFrameType.Request &&
					f.payload instanceof Security2CCNonceReport,
				{
					noMatch: true,
				},
			);

			t.pass();
		},
	},
);
