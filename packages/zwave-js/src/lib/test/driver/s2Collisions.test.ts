import {
	BasicCCSet,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
} from "@zwave-js/cc";
import { SecurityClass, SecurityManager2 } from "@zwave-js/core";
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
		controller.host.securityManager2 = sm;
		controller.host.getHighestSecurityClass = () =>
			SecurityClass.S2_Unauthenticated;

		// Respond to Nonce Get
		const respondToNonceGet: MockNodeBehavior = {
			async onControllerFrame(controller, self, frame) {
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof Security2CCNonceGet
				) {
					const nonce = sm.generateNonce(controller.host.ownNodeId);
					const cc = new Security2CCNonceReport(controller.host, {
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

	testBody: async (driver, node, _mockController, mockNode) => {
		// Send a secure Basic SET
		let basicSetPromise = node.commandClasses.Basic.set(1);

		let { payload: response } =
			await mockNode.expectControllerFrame<MockZWaveRequestFrame>(
				1000,
				(msg): msg is MockZWaveRequestFrame => {
					return (
						msg.type === MockZWaveFrameType.Request &&
						msg.payload instanceof Security2CCMessageEncapsulation
					);
				},
			);
		expect(
			(response as Security2CCMessageEncapsulation).encapsulated,
		).toBeInstanceOf(BasicCCSet);

		await basicSetPromise;

		await wait(100);

		basicSetPromise = node.commandClasses.Basic.set(2);

		({ payload: response } =
			await mockNode.expectControllerFrame<MockZWaveRequestFrame>(
				1000,
				(msg): msg is MockZWaveRequestFrame => {
					return (
						msg.type === MockZWaveFrameType.Request &&
						msg.payload instanceof Security2CCMessageEncapsulation
					);
				},
			));

		const inner = (response as Security2CCMessageEncapsulation)
			.encapsulated;
		expect(inner).toBeInstanceOf(BasicCCSet);
		expect((inner as BasicCCSet).targetValue).toBe(2);

		await basicSetPromise;

		// Give everything a second to settle
		await wait(1000);
	},
});
