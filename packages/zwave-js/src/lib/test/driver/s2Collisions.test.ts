import {
	BasicCCSet,
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
	createMockZWaveRequestFrame,
	MockZWaveFrameType,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest("Test S2 Collisions", {
	debug: true,
	// We need the cache to skip the CC interviews and mark S2 as supported
	provisioningDirectory: path.join(__dirname, "fixtures/s2Collisions"),

	// nodeCapabilities: {
	// 	commandClasses: [
	// 		{
	// 			ccId: CommandClasses["Multilevel Switch"],
	// 			isSupported: true,
	// 			version: 4,
	// 		},
	// 		{
	// 			ccId: CommandClasses.Supervision,
	// 			isSupported: true,
	// 			secure: false,
	// 		},
	// 	],
	// },

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
		// To simulate multiple nodes, we'd need a host/security manager per node, not one for the controller
		mockNode.host.securityManager2 = smNode;
		mockNode.host.getHighestSecurityClass = () =>
			SecurityClass.S2_Unauthenticated;

		// Create a security manager for the node
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
		// To simulate multiple nodes, we'd need a host/security manager per node, not one for the controller
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

		// 	// Just have the node respond to all Supervision Get positively
		// 	const respondToSupervisionGet: MockNodeBehavior = {
		// 		async onControllerFrame(controller, self, frame) {
		// 			if (
		// 				frame.type === MockZWaveFrameType.Request &&
		// 				frame.payload instanceof SupervisionCCGet
		// 			) {
		// 				const cc = new SupervisionCCReport(controller.host, {
		// 					nodeId: self.id,
		// 					sessionId: frame.payload.sessionId,
		// 					moreUpdatesFollow: false,
		// 					status: SupervisionStatus.Success,
		// 				});
		// 				await self.sendToController(
		// 					createMockZWaveRequestFrame(cc, {
		// 						ackRequested: false,
		// 					}),
		// 				);
		// 				return true;
		// 			}
		// 			return false;
		// 		},
		// 	};
		// 	mockNode.defineBehavior(respondToSupervisionGet);
	},

	testBody: async (driver, node, mockController, mockNode) => {
		// Send a secure Basic SET to sync the SPAN
		await node.commandClasses.Basic.set(1);

		driver.driverLog.print("----------");
		driver.driverLog.print("START TEST");
		driver.driverLog.print("----------");

		// Now create a collision
		const nodeToHost = Security2CC.encapsulate(
			mockNode.host,
			new BasicCCSet(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				targetValue: 0,
			}),
		);
		const p1 = mockNode.sendToController(
			createMockZWaveRequestFrame(nodeToHost, {
				ackRequested: true,
			}),
		);
		const p2 = node.commandClasses.Basic.set(0);

		await Promise.all([p1, p2]);

		// Give everything a second to settle
		await wait(1000);
	},
});
