import {
	BasicCCGet,
	BasicCCReport,
	InvalidCC,
	Security2CC,
	Security2CCMessageEncapsulation,
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
	MockZWaveRequestFrame,
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
		const sm = new SecurityManager2();
		// Copy keys from the driver
		sm.setKey(
			SecurityClass.S2_AccessControl,
			driver.options.securityKeys!.S2_AccessControl!,
		);
		sm.setKey(
			SecurityClass.S2_Authenticated,
			driver.options.securityKeys!.S2_Authenticated!,
		);
		sm.setKey(
			SecurityClass.S2_Unauthenticated,
			driver.options.securityKeys!.S2_Unauthenticated!,
		);
		// To simulate multiple nodes, we'd need a host/security manager per node, not one for the controller
		mockNode.host.securityManager2 = sm;
		mockNode.host.getHighestSecurityClass = () =>
			SecurityClass.S2_Unauthenticated;

		// Respond to Nonce Get
		const respondToNonceGet: MockNodeBehavior = {
			async onControllerFrame(controller, self, frame) {
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof Security2CCNonceGet
				) {
					const nonce = sm.generateNonce(controller.host.ownNodeId);
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
						const nonce = sm.generateNonce(
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

		// let { payload: response } =
		// 	await mockNode.expectControllerFrame<MockZWaveRequestFrame>(
		// 		1000,
		// 		(msg): msg is MockZWaveRequestFrame => {
		// 			return (
		// 				msg.type === MockZWaveFrameType.Request &&
		// 				msg.payload instanceof Security2CCMessageEncapsulation
		// 			);
		// 		},
		// 	);

		await wait(2000);

		// Delete the SPAN state on the node
		mockController.host.securityManager2!.deleteNonce(1);

		const basicGetPromise = node.commandClasses.Basic.get();

		const { payload: response } =
			await mockNode.expectControllerFrame<MockZWaveRequestFrame>(
				1000,
				(msg): msg is MockZWaveRequestFrame => {
					return (
						msg.type === MockZWaveFrameType.Request &&
						msg.payload instanceof Security2CCMessageEncapsulation
					);
				},
			);
		const inner = (response as Security2CCMessageEncapsulation)
			.encapsulated;
		expect(inner).toBeInstanceOf(BasicCCGet);

		const basicReport = new BasicCCReport(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			currentValue: 1,
		});
		const secureResponse = Security2CC.encapsulate(
			mockController.host,
			basicReport,
		);

		await mockNode.sendToController(
			createMockZWaveRequestFrame(secureResponse, {
				ackRequested: true,
			}),
		);

		await basicGetPromise;

		// Give everything a second to settle
		await wait(1000);
	},
});
