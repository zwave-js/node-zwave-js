import {
	type CommandClass,
	InvalidCC,
	Security2CC,
	Security2CCCommandsSupportedGet,
	Security2CCCommandsSupportedReport,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	SecurityCC,
	SecurityCCCommandEncapsulation,
	SecurityCCCommandsSupportedGet,
	SecurityCCCommandsSupportedReport,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
	VersionCCCommandClassGet,
	VersionCCCommandClassReport,
} from "@zwave-js/cc";
import {
	CommandClasses,
	SecurityClass,
	SecurityManager,
	SecurityManager2,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	type MockNodeBehavior,
	type MockZWaveFrame,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite.js";

// Repro for https://github.com/zwave-js/zwave-js/issues/6305

integrationTest(
	"CC Version 0 is ignored for known supported CCs: Security S2",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Security 2"],
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const smNode = await SecurityManager2.create();
			// Copy keys from the driver
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

			const reportSecurelySupportedCCs: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.securityClass
							=== SecurityClass.S2_Unauthenticated
						&& receivedCC.encapsulated
							instanceof Security2CCCommandsSupportedGet
					) {
						let cc: CommandClass =
							new Security2CCCommandsSupportedReport({
								nodeId: controller.ownNodeId,
								supportedCCs: [
									// The node supports Version CC securely
									CommandClasses.Version,
								],
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
			mockNode.defineBehavior(reportSecurelySupportedCCs);

			const respondWithInvalidVersionReport: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.encapsulated
							instanceof VersionCCCommandClassGet
						&& receivedCC.encapsulated.requestedCC
							=== CommandClasses["Security 2"]
					) {
						let cc: CommandClass = new VersionCCCommandClassReport({
							nodeId: controller.ownNodeId,
							requestedCC: receivedCC.encapsulated.requestedCC,
							ccVersion: 0,
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
			mockNode.defineBehavior(respondWithInvalidVersionReport);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.expect(node.supportsCC(CommandClasses["Security 2"])).toBe(true);
		},
	},
);

integrationTest(
	"CC Version 0 is ignored for known supported CCs: Security S0",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses.Security,
			],
		},

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const sm0Node = new SecurityManager({
				ownNodeId: mockNode.id,
				networkKey: driver.options.securityKeys!.S0_Legacy!,
				nonceTimeout: 100000,
			});
			mockNode.securityManagers.securityManager = sm0Node;

			// Create a security manager for the controller
			const sm0Ctrlr = new SecurityManager({
				ownNodeId: controller.ownNodeId,
				networkKey: driver.options.securityKeys!.S0_Legacy!,
				nonceTimeout: 100000,
			});
			controller.securityManagers.securityManager = sm0Ctrlr;

			// Respond to S0 Nonce Get
			const respondToS0NonceGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof SecurityCCNonceGet) {
						const nonce = sm0Node.generateNonce(
							controller.ownNodeId,
							8,
						);
						const cc = new SecurityCCNonceReport({
							nodeId: controller.ownNodeId,
							nonce,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToS0NonceGet);

			const reportSecurelySupportedCCs: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (
						receivedCC instanceof SecurityCCCommandEncapsulation
						&& receivedCC.encapsulated
							instanceof SecurityCCCommandsSupportedGet
					) {
						const nonceGet = new SecurityCCNonceGet({
							nodeId: controller.ownNodeId,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(nonceGet, {
								ackRequested: false,
							}),
						);

						const nonceReport = await self.expectControllerFrame(
							1000,
							(
								resp,
							): resp is MockZWaveFrame & {
								type: MockZWaveFrameType.Request;
								payload: SecurityCCNonceReport;
							} => resp.type === MockZWaveFrameType.Request
								&& resp.payload
									instanceof SecurityCCNonceReport,
						);
						const receiverNonce = nonceReport.payload.nonce;

						const response: CommandClass =
							new SecurityCCCommandsSupportedReport({
								nodeId: controller.ownNodeId,
								supportedCCs: [
									// The node supports Version CC securely
									CommandClasses.Version,
								],
								controlledCCs: [],
								reportsToFollow: 0,
							});
						const cc = SecurityCC.encapsulate(
							self.id,
							self.securityManagers.securityManager!,
							response,
						);
						cc.nonce = receiverNonce;
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						return { action: "stop" };
					}
				},
			};
			mockNode.defineBehavior(reportSecurelySupportedCCs);

			const respondWithInvalidVersionReport: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof SecurityCCCommandEncapsulation
						&& receivedCC.encapsulated
							instanceof VersionCCCommandClassGet
						&& receivedCC.encapsulated.requestedCC
							=== CommandClasses.Security
					) {
						await wait(100);
						const nonceGet = new SecurityCCNonceGet({
							nodeId: controller.ownNodeId,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(nonceGet, {
								ackRequested: false,
							}),
						);

						const nonceReport = await self.expectControllerFrame(
							1000,
							(
								resp,
							): resp is MockZWaveFrame & {
								type: MockZWaveFrameType.Request;
								payload: SecurityCCNonceReport;
							} => resp.type === MockZWaveFrameType.Request
								&& resp.payload
									instanceof SecurityCCNonceReport,
						);
						const receiverNonce = nonceReport.payload.nonce;

						const response: CommandClass =
							new VersionCCCommandClassReport({
								nodeId: controller.ownNodeId,
								requestedCC:
									receivedCC.encapsulated.requestedCC,
								ccVersion: 0,
							});

						const cc = SecurityCC.encapsulate(
							self.id,
							self.securityManagers.securityManager!,
							response,
						);
						cc.nonce = receiverNonce;
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						return { action: "stop" };
					}
				},
			};
			mockNode.defineBehavior(respondWithInvalidVersionReport);

			// Parse Security CC commands
			const parseS0CC: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					// We don't support sequenced commands here
					if (receivedCC instanceof SecurityCCCommandEncapsulation) {
						await receivedCC.mergePartialCCs([], {
							sourceNodeId: controller.ownNodeId,
							__internalIsMockNode: true,
							frameType: "singlecast",
							...self.encodingContext,
							...self.securityManagers,
						});
					}
					// This just decodes - we need to call further handlers
					return undefined;
				},
			};
			mockNode.defineBehavior(parseS0CC);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.expect(node.supportsCC(CommandClasses["Security"])).toBe(true);
		},
	},
);
