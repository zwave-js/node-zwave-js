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
import { integrationTest } from "../integrationTestSuite";

// Repro for https://github.com/zwave-js/node-zwave-js/issues/6305

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
			const smNode = new SecurityManager2();
			// Copy keys from the driver
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
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof Security2CCNonceGet
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
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof InvalidCC
					) {
						if (
							frame.payload.reason
								=== ZWaveErrorCodes.Security2CC_CannotDecode
							|| frame.payload.reason
								=== ZWaveErrorCodes.Security2CC_NoSPAN
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

			const reportSecurelySupportedCCs: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload
							instanceof Security2CCMessageEncapsulation
						&& frame.payload.securityClass
							=== SecurityClass.S2_Unauthenticated
						&& frame.payload.encapsulated
							instanceof Security2CCCommandsSupportedGet
					) {
						let cc: CommandClass =
							new Security2CCCommandsSupportedReport(
								self.host,
								{
									nodeId: controller.host.ownNodeId,
									supportedCCs: [
										// The node supports Version CC securely
										CommandClasses.Version,
									],
								},
							);
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
			mockNode.defineBehavior(reportSecurelySupportedCCs);

			const respondWithInvalidVersionReport: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload
							instanceof Security2CCMessageEncapsulation
						&& frame.payload.encapsulated
							instanceof VersionCCCommandClassGet
						&& frame.payload.encapsulated.requestedCC
							=== CommandClasses["Security 2"]
					) {
						let cc: CommandClass = new VersionCCCommandClassReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								requestedCC:
									frame.payload.encapsulated.requestedCC,
								ccVersion: 0,
							},
						);
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
			mockNode.defineBehavior(respondWithInvalidVersionReport);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.true(node.supportsCC(CommandClasses["Security 2"]));
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
			mockNode.host.securityManager = sm0Node;

			// Create a security manager for the controller
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
						frame.type === MockZWaveFrameType.Request
						&& frame.payload instanceof SecurityCCNonceGet
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

			const reportSecurelySupportedCCs: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload
							instanceof SecurityCCCommandEncapsulation
						&& frame.payload.encapsulated
							instanceof SecurityCCCommandsSupportedGet
					) {
						const nonceGet = new SecurityCCNonceGet(self.host, {
							nodeId: controller.host.ownNodeId,
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
							new SecurityCCCommandsSupportedReport(
								self.host,
								{
									nodeId: controller.host.ownNodeId,
									supportedCCs: [
										// The node supports Version CC securely
										CommandClasses.Version,
									],
									controlledCCs: [],
								},
							);
						const cc = SecurityCC.encapsulate(self.host, response);
						cc.nonce = receiverNonce;

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
			mockNode.defineBehavior(reportSecurelySupportedCCs);

			const respondWithInvalidVersionReport: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload
							instanceof SecurityCCCommandEncapsulation
						&& frame.payload.encapsulated
							instanceof VersionCCCommandClassGet
						&& frame.payload.encapsulated.requestedCC
							=== CommandClasses.Security
					) {
						await wait(100);
						const nonceGet = new SecurityCCNonceGet(self.host, {
							nodeId: controller.host.ownNodeId,
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
							new VersionCCCommandClassReport(
								self.host,
								{
									nodeId: controller.host.ownNodeId,
									requestedCC:
										frame.payload.encapsulated.requestedCC,
									ccVersion: 0,
								},
							);

						const cc = SecurityCC.encapsulate(self.host, response);
						cc.nonce = receiverNonce;

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
			mockNode.defineBehavior(respondWithInvalidVersionReport);

			// Parse Security CC commands
			const parseS0CC: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					// We don't support sequenced commands here
					if (
						frame.type === MockZWaveFrameType.Request
						&& frame.payload
							instanceof SecurityCCCommandEncapsulation
					) {
						frame.payload.mergePartialCCs(undefined as any, []);
					}
					return false;
				},
			};
			mockNode.defineBehavior(parseS0CC);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.true(node.supportsCC(CommandClasses["Security"]));
		},
	},
);
