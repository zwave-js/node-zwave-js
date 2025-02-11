import {
	BasicCCGet,
	BasicCCReport,
	SecurityCC,
	SecurityCCCommandEncapsulation,
	SecurityCCCommandsSupportedGet,
	SecurityCCCommandsSupportedReport,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "@zwave-js/cc";
import { CommandClasses, SecurityManager } from "@zwave-js/core";
import {
	type MockNodeBehavior,
	type MockZWaveFrame,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuiteMulti.js";

integrationTest(
	"Security S0 Nonce Get is answered while waiting for a reply from another node",
	{
		// debug: true,

		nodeCapabilities: [
			{
				id: 2,
				capabilities: {
					commandClasses: [
						CommandClasses.Basic,
						CommandClasses.Security,
					],
				},
			},
			{
				id: 3,
				capabilities: {
					commandClasses: [
						CommandClasses.Basic,
						CommandClasses.Security,
					],
				},
			},
		],

		customSetup: async (driver, controller, mockNodes) => {
			for (const mockNode of mockNodes) {
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

				// Respond to S0 Commands Supported Get
				const respondToS0CommandsSupportedGet: MockNodeBehavior = {
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

							const nonceReport = await self
								.expectControllerFrame(
									1000,
									(
										resp,
									): resp is MockZWaveFrame & {
										type: MockZWaveFrameType.Request;
										payload: SecurityCCNonceReport;
									} => resp.type
											=== MockZWaveFrameType.Request
										&& resp.payload
											instanceof SecurityCCNonceReport,
								);
							const receiverNonce = nonceReport.payload.nonce;

							const response =
								new SecurityCCCommandsSupportedReport({
									nodeId: controller.ownNodeId,
									supportedCCs: [CommandClasses.Basic],
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
				mockNode.defineBehavior(respondToS0CommandsSupportedGet);

				// Respond to S0-encapsulated Basic Get with a level that increases with each request
				let queryCount = 0;
				const respondToS0BasicGet: MockNodeBehavior = {
					async handleCC(controller, self, receivedCC) {
						if (
							receivedCC instanceof SecurityCCCommandEncapsulation
							&& receivedCC.encapsulated instanceof BasicCCGet
						) {
							// Introduce a delay in the response for the second query (after interview)
							// so we can simulate the other node interfering
							queryCount++;
							if (queryCount === 2) {
								await wait(750);
							}

							const nonceGet = new SecurityCCNonceGet({
								nodeId: controller.ownNodeId,
							});
							await self.sendToController(
								createMockZWaveRequestFrame(nonceGet, {
									ackRequested: false,
								}),
							);

							const nonceReport = await self
								.expectControllerFrame(
									1000,
									(
										resp,
									): resp is MockZWaveFrame & {
										type: MockZWaveFrameType.Request;
										payload: SecurityCCNonceReport;
									} => resp.type
											=== MockZWaveFrameType.Request
										&& resp.payload
											instanceof SecurityCCNonceReport,
								);
							const receiverNonce = nonceReport.payload.nonce;

							const response = new BasicCCReport({
								nodeId: controller.ownNodeId,
								currentValue: queryCount,
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
				mockNode.defineBehavior(respondToS0BasicGet);

				// Parse Security CC commands. This MUST be defined last, since defineBehavior will prepend it to the list
				const parseS0CC: MockNodeBehavior = {
					async handleCC(controller, self, receivedCC) {
						// We don't support sequenced commands here
						if (
							receivedCC instanceof SecurityCCCommandEncapsulation
						) {
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
			}
		},

		testBody: async (
			t,
			driver,
			[node2, node3],
			mockController,
			[mockNode2, mockNode3],
		) => {
			const basicGet = node2.commandClasses.Basic.get();

			await wait(150);

			// Now send a Nonce Get from node 3, which must be answered immediately
			const nonceGet = new SecurityCCNonceGet({
				nodeId: mockController.ownNodeId,
			});
			await mockNode3.sendToController(
				createMockZWaveRequestFrame(nonceGet, {
					ackRequested: false,
				}),
			);

			await mockNode3
				.expectControllerFrame(
					250,
					(
						resp,
					): resp is MockZWaveFrame & {
						type: MockZWaveFrameType.Request;
						payload: SecurityCCNonceReport;
					} => resp.type === MockZWaveFrameType.Request
						&& resp.payload instanceof SecurityCCNonceReport,
				)
				.catch(() => {
					throw new Error(
						"The controller did not reply to the Nonce Get ASAP",
					);
				});

			t.expect((await basicGet)?.currentValue).toBe(2);
		},
	},
);
