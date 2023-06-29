import {
	InvalidCC,
	Security2CC,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	SecurityCCCommandEncapsulation,
	SecurityCCCommandsSupportedGet,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
	SupervisionCCGet,
	SupervisionCCReport,
	type CommandClass,
} from "@zwave-js/cc";
import {
	SecurityClass,
	SecurityManager,
	SecurityManager2,
	SupervisionStatus,
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

integrationTest("S0 commands are S0-encapsulated, even when S2 is supported", {
	// debug: true,

	// We need the cache to skip the CC interviews and mark S2 as supported
	provisioningDirectory: path.join(
		__dirname,
		"fixtures/s0AndS2Encapsulation",
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
		mockNode.host.securityManager2 = sm2Node;
		mockNode.host.getHighestSecurityClass = () =>
			SecurityClass.S2_Unauthenticated;

		const sm0Node = new SecurityManager({
			ownNodeId: mockNode.id,
			networkKey: driver.options.securityKeys!.S0_Legacy!,
			nonceTimeout: 100000,
		});
		mockNode.host.securityManager = sm0Node;

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

		const sm0Ctrlr = new SecurityManager({
			ownNodeId: controller.host.ownNodeId,
			networkKey: driver.options.securityKeys!.S0_Legacy!,
			nonceTimeout: 100000,
		});
		controller.host.securityManager = sm0Ctrlr;

		// Respond to S0 Nonce Get
		const respondToS0NonceGet: MockNodeBehavior = {
			async onControllerFrame(controller, self, frame) {
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof SecurityCCNonceGet
				) {
					const nonce = sm0Node.generateNonce(
						controller.host.ownNodeId,
						8,
					);
					const cc = new SecurityCCNonceReport(self.host, {
						nodeId: controller.host.ownNodeId,
						nonce,
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
		mockNode.defineBehavior(respondToS0NonceGet);

		// Parse Security CC commands
		const parseS0CC: MockNodeBehavior = {
			async onControllerFrame(controller, self, frame) {
				// We don't support sequenced commands here
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof SecurityCCCommandEncapsulation
				) {
					frame.payload.mergePartialCCs(undefined as any, []);
				}
				return false;
			},
		};
		mockNode.defineBehavior(parseS0CC);

		// Respond to S2 Nonce Get
		const respondToS2NonceGet: MockNodeBehavior = {
			async onControllerFrame(controller, self, frame) {
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof Security2CCNonceGet
				) {
					const nonce = sm2Node.generateNonce(
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
		mockNode.defineBehavior(respondToS2NonceGet);

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
						const nonce = sm2Node.generateNonce(
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

		// Just have the node respond to all Supervision Get positively
		const respondToSupervisionGet: MockNodeBehavior = {
			async onControllerFrame(controller, self, frame) {
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof Security2CCMessageEncapsulation &&
					frame.payload.encapsulated instanceof SupervisionCCGet
				) {
					let cc: CommandClass = new SupervisionCCReport(self.host, {
						nodeId: controller.host.ownNodeId,
						sessionId: frame.payload.encapsulated.sessionId,
						moreUpdatesFollow: false,
						status: SupervisionStatus.Success,
					});
					cc = Security2CC.encapsulate(self.host, cc);
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
		mockNode.defineBehavior(respondToSupervisionGet);
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		await node.commandClasses.Security.getSupportedCommands();

		await wait(100);
		mockNode.assertReceivedControllerFrame(
			(f) =>
				f.type === MockZWaveFrameType.Request &&
				f.payload instanceof SecurityCCCommandEncapsulation &&
				f.payload.encapsulated instanceof
					SecurityCCCommandsSupportedGet,
		);

		t.pass();
	},
});
