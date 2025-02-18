import {
	BasicCCReport,
	BasicCCValues,
	type CommandClass,
	InvalidCC,
	Security2CC,
	Security2CCNonceGet,
	Security2CCNonceReport,
} from "@zwave-js/cc";
import {
	SecurityClass,
	SecurityManager2,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	type MockNodeBehavior,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"Security S2: Completely discard commands that should have been encrypted, but are not",
	{
		// debug: true,

		// We need the cache to skip the CC interviews and mark S2 as supported
		provisioningDirectory: path.join(__dirname, "fixtures/securityS2"),

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const smNode = await SecurityManager2.create();
			// Copy keys from the driver
			await smNode.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			await smNode.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			await smNode.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			mockNode.securityManagers.securityManager2 = smNode;
			mockNode.encodingContext.getHighestSecurityClass = () =>
				SecurityClass.S2_Unauthenticated;

			// Create a security manager for the controller
			const smCtrlr = await SecurityManager2.create();
			// Copy keys from the driver
			await smCtrlr.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			await smCtrlr.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			await smCtrlr.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			controller.securityManagers.securityManager2 = smCtrlr;
			// controller.parsingContext.getHighestSecurityClass =
			controller.encodingContext.getHighestSecurityClass = () =>
				SecurityClass.S2_Unauthenticated;

			// Respond to Nonce Get
			const respondToNonceGet: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof Security2CCNonceGet) {
						const nonce = await smNode.generateNonce(
							controller.ownNodeId,
						);
						const cc = new Security2CCNonceReport({
							nodeId: controller.ownNodeId,
							SOS: true,
							MOS: false,
							receiverEI: nonce,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToNonceGet);

			// Handle decode errors
			const handleInvalidCC: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof InvalidCC) {
						if (
							receivedCC.reason
								=== ZWaveErrorCodes.Security2CC_CannotDecode
							|| receivedCC.reason
								=== ZWaveErrorCodes.Security2CC_NoSPAN
						) {
							const nonce = await smNode.generateNonce(
								controller.ownNodeId,
							);
							const cc = new Security2CCNonceReport({
								nodeId: controller.ownNodeId,
								SOS: true,
								MOS: false,
								receiverEI: nonce,
							});
							return { action: "sendCC", cc };
						}
					}
				},
			};
			mockNode.defineBehavior(handleInvalidCC);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Send a secure Basic SET to sync the SPAN
			await node.commandClasses.Basic.set(1);

			driver.driverLog.print("----------");
			driver.driverLog.print("START TEST");
			driver.driverLog.print("----------");

			// Send a secure command that should be handled
			let nodeToHost: CommandClass = Security2CC.encapsulate(
				new BasicCCReport({
					nodeId: mockController.ownNodeId,
					currentValue: 99,
				}),
				mockNode.id,
				mockNode.securityManagers,
			);
			await mockNode.sendToController(
				createMockZWaveRequestFrame(nodeToHost, {
					ackRequested: true,
				}),
			);

			// Bit of delay to allow the command to be handled
			await wait(100);

			let currentValue = node.getValue(BasicCCValues.currentValue.id);
			t.expect(currentValue).toBe(99);

			// Then send an unencypted one that should be discarded
			nodeToHost = new BasicCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: 1,
			});

			await mockNode.sendToController(
				createMockZWaveRequestFrame(nodeToHost, {
					ackRequested: true,
				}),
			);

			// Bit of delay to allow the command to be handled
			await wait(100);

			currentValue = node.getValue(BasicCCValues.currentValue.id);
			t.expect(currentValue).toBe(99); // unchanged
		},
	},
);
