import {
	BasicCCReport,
	BasicCCValues,
	InvalidCC,
	Security2CC,
	Security2CCNonceGet,
	Security2CCNonceReport,
	type CommandClass,
} from "@zwave-js/cc";
import {
	SecurityClass,
	SecurityManager2,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Security S2: Completely discard commands that should have been encrypted, but are not",
	{
		// debug: true,

		// We need the cache to skip the CC interviews and mark S2 as supported
		provisioningDirectory: path.join(__dirname, "fixtures/securityS2"),

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const smNode = new SecurityManager2();
			// Copy keys from the driver
			smNode.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			smNode.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			smNode.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			mockNode.host.securityManager2 = smNode;
			mockNode.host.getHighestSecurityClass = () =>
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
			controller.host.securityManager2 = smCtrlr;
			controller.host.getHighestSecurityClass = () =>
				SecurityClass.S2_Unauthenticated;

			// Respond to Nonce Get
			const respondToNonceGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof Security2CCNonceGet
					) {
						const nonce = smNode.generateNonce(
							controller.host.ownNodeId,
						);
						const cc = new Security2CCNonceReport(self.host, {
							nodeId: controller.host.ownNodeId,
							SOS: true,
							MOS: false,
							receiverEI: nonce,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);
						return true;
					}
					return false;
				},
			};
			mockNode.defineBehavior(respondToNonceGet);

			// Handle decode errors
			const handleInvalidCC: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof InvalidCC
					) {
						if (
							frame.payload.reason ===
								ZWaveErrorCodes.Security2CC_CannotDecode ||
							frame.payload.reason ===
								ZWaveErrorCodes.Security2CC_NoSPAN
						) {
							const nonce = smNode.generateNonce(
								controller.host.ownNodeId,
							);
							const cc = new Security2CCNonceReport(self.host, {
								nodeId: controller.host.ownNodeId,
								SOS: true,
								MOS: false,
								receiverEI: nonce,
							});
							await self.sendToController(
								createMockZWaveRequestFrame(cc, {
									ackRequested: false,
								}),
							);
							return true;
						}
					}
					return false;
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
				mockNode.host,
				new BasicCCReport(mockNode.host, {
					nodeId: mockController.host.ownNodeId,
					currentValue: 99,
				}),
			);
			await mockNode.sendToController(
				createMockZWaveRequestFrame(nodeToHost, {
					ackRequested: true,
				}),
			);

			// Bit of delay to allow the command to be handled
			await wait(100);

			let currentValue = node.getValue(BasicCCValues.currentValue.id);
			t.is(currentValue, 99);

			// Then send an unencypted one that should be discarded
			nodeToHost = new BasicCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
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
			t.is(currentValue, 99); // unchanged
		},
	},
);
