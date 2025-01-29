import {
	BasicCCReport,
	BasicCCValues,
	BinarySwitchCCReport,
	BinarySwitchCCValues,
	type CommandClass,
	InvalidCC,
	Security2CC,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	SupervisionCC,
	SupervisionCCGet,
	SupervisionCCReport,
} from "@zwave-js/cc";
import {
	SecurityClass,
	SecurityManager2,
	SupervisionStatus,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	type MockNodeBehavior,
	MockZWaveFrameType,
	type MockZWaveRequestFrame,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"S2 Collisions: Both nodes send at the same time, with supervision",
	{
		// debug: true,

		// We need the cache to skip the CC interviews and mark S2 as supported
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/s2CollisionsSupervised",
		),

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

			// Just have the node respond to all Supervision Get positively
			const respondToSupervisionGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.encapsulated
							instanceof SupervisionCCGet
					) {
						let cc: CommandClass = new SupervisionCCReport({
							nodeId: controller.ownNodeId,
							sessionId: receivedCC.encapsulated.sessionId,
							moreUpdatesFollow: false,
							status: SupervisionStatus.Success,
						});
						cc = Security2CC.encapsulate(
							cc,
							self.id,
							self.securityManagers,
						);
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToSupervisionGet);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Send a secure Binary Switch SET to sync the SPAN
			await node.commandClasses["Binary Switch"].set(false);

			driver.driverLog.print("----------");
			driver.driverLog.print("START TEST");
			driver.driverLog.print("----------");

			// We use supervision here, so we can ensure that the SET requests were completed

			// Now create a collision by having both parties send at the same time
			const nodeToHost = Security2CC.encapsulate(
				new BinarySwitchCCReport({
					nodeId: mockController.ownNodeId,
					currentValue: true,
				}),
				mockNode.id,
				mockNode.securityManagers,
			);
			const p1 = mockNode.sendToController(
				createMockZWaveRequestFrame(nodeToHost, {
					ackRequested: true,
				}),
			);
			const p2 = node.commandClasses["Binary Switch"].set(false);

			const [, p2result] = await Promise.all([p1, p2]);

			// Give the node a chance to respond
			await wait(250);

			// If the collision was handled gracefully, we should now have the value reported by the node
			const currentValue = node.getValue(
				BinarySwitchCCValues.currentValue.id,
			);
			t.expect(currentValue).toBe(true);

			// Ensure the Binary Switch Set causing a collision eventually gets resolved
			t.expect(p2result).toMatchObject({
				status: SupervisionStatus.Success,
			});
		},
	},
);

integrationTest(
	"S2 Collisions: Both nodes send at the same time, unsupervised",
	{
		// debug: true,

		// We need the cache to skip the CC interviews and mark S2 as supported
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/s2CollisionsUnsupervised",
		),

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

			// We use supervision here, so we can ensure that the SET requests were completed

			// Now create a collision by having both parties send at the same time
			const nodeToHost = Security2CC.encapsulate(
				new BasicCCReport({
					nodeId: mockController.ownNodeId,
					currentValue: 99,
				}),
				mockNode.id,
				mockNode.securityManagers,
			);
			const p1 = mockNode.sendToController(
				createMockZWaveRequestFrame(nodeToHost, {
					ackRequested: true,
				}),
			);
			const p2 = node.commandClasses.Basic.set(0);

			await Promise.all([p1, p2]);

			// Give the node a chance to respond
			await wait(250);

			// If the collision was handled gracefully, we should now have the value reported by the node
			const currentValue = node.getValue(BasicCCValues.currentValue.id);
			t.expect(currentValue).toBe(99);
		},
	},
);

integrationTest(
	"S2 Collisions: Node sends supervised command at the same time as the controller",
	{
		// Repro for #6100
		// debug: true,

		// We need the cache to skip the CC interviews and mark S2 as supported
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/s2CollisionsSupervised",
		),

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

			// Just have the node respond to all Supervision Get positively
			const respondToSupervisionGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.encapsulated
							instanceof SupervisionCCGet
					) {
						let cc: CommandClass = new SupervisionCCReport({
							nodeId: controller.ownNodeId,
							sessionId: receivedCC.encapsulated.sessionId,
							moreUpdatesFollow: false,
							status: SupervisionStatus.Success,
						});
						cc = Security2CC.encapsulate(
							cc,
							self.id,
							self.securityManagers,
						);
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToSupervisionGet);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			driver.driverLog.print("----------");
			driver.driverLog.print("START TEST");
			driver.driverLog.print("----------");

			// Driver sends Binary Switch ON command, supervised with S2
			await node.commandClasses["Binary Switch"].set(true);

			driver.driverLog.print("---------------");
			driver.driverLog.print("START COLLISION");
			driver.driverLog.print("---------------");

			// Driver sends Binary Switch OFF command, supervised with S2
			const turnOff = node.commandClasses["Binary Switch"].set(false);

			// Node sends supervised Binary Switch report at the same time
			let nodeToHost: CommandClass = new BinarySwitchCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: true,
			});
			nodeToHost = SupervisionCC.encapsulate(
				nodeToHost,
				driver.getNextSupervisionSessionId(
					mockController.ownNodeId,
				),
				false,
			);
			nodeToHost = Security2CC.encapsulate(
				nodeToHost,
				mockNode.id,
				mockNode.securityManagers,
			);

			const report = mockNode.sendToController(
				createMockZWaveRequestFrame(nodeToHost, {
					ackRequested: true,
				}),
			);
			const reportConfirmation = mockNode.expectControllerFrame(
				500,
				(f): f is MockZWaveRequestFrame =>
					f.type === MockZWaveFrameType.Request
					&& f.payload instanceof Security2CCMessageEncapsulation
					&& f.payload.encapsulated instanceof SupervisionCCReport
					&& f.payload.encapsulated.status
						=== SupervisionStatus.Success,
			);

			// We want both transactions to be completed successfully
			const [turnOffResult, reportResult, confirmationResult] =
				await Promise.all([turnOff, report, reportConfirmation]);

			t.expect(turnOffResult).toStrictEqual({
				status: SupervisionStatus.Success,
			});
			t.expect(confirmationResult).toBeDefined();

			// // Now create a collision by having both parties send at the same time
			// const nodeToHost = Security2CC.encapsulate(
			// 	new BasicCCReport({
			// 		nodeId: mockController.ownNodeId,
			// 		currentValue: 99,
			// 	}),
			// );
			// const p1 = mockNode.sendToController(
			// 	createMockZWaveRequestFrame(nodeToHost, {
			// 		ackRequested: true,
			// 	}),
			// );
			// const p2 = node.commandClasses.Basic.set(0);

			// const [, p2result] = await Promise.all([p1, p2]);

			// // Give the node a chance to respond
			// await wait(250);

			// // If the collision was handled gracefully, we should now have the value reported by the node
			// const currentValue = node.getValue(BasicCCValues.currentValue.id);
			// t.is(currentValue, 99);

			// // Ensure the Basic Set causing a collision eventually gets resolved
			// t.like(p2result, {
			// 	status: SupervisionStatus.Success,
			// });
		},
	},
);
