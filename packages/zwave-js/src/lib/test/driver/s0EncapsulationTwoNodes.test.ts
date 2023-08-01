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
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockNodeBehavior,
	type MockZWaveFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuiteMulti";

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

				// Respond to S0 Commands Supported Get
				const respondToS0CommandsSupportedGet: MockNodeBehavior = {
					async onControllerFrame(controller, self, frame) {
						if (
							frame.type === MockZWaveFrameType.Request &&
							frame.payload instanceof
								SecurityCCCommandEncapsulation &&
							frame.payload.encapsulated instanceof
								SecurityCCCommandsSupportedGet
						) {
							const nonceGet = new SecurityCCNonceGet(self.host, {
								nodeId: controller.host.ownNodeId,
							});
							await self.sendToController(
								createMockZWaveRequestFrame(nonceGet, {
									ackRequested: false,
								}),
							);

							const nonceReport =
								await self.expectControllerFrame(
									1000,
									(
										resp,
									): resp is MockZWaveFrame & {
										type: MockZWaveFrameType.Request;
										payload: SecurityCCNonceReport;
									} =>
										resp.type ===
											MockZWaveFrameType.Request &&
										resp.payload instanceof
											SecurityCCNonceReport,
								);
							const receiverNonce = nonceReport.payload.nonce;

							const response =
								new SecurityCCCommandsSupportedReport(
									self.host,
									{
										nodeId: controller.host.ownNodeId,
										supportedCCs: [CommandClasses.Basic],
										controlledCCs: [],
									},
								);
							const cc = SecurityCC.encapsulate(
								self.host,
								response,
							);
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
				mockNode.defineBehavior(respondToS0CommandsSupportedGet);

				// Respond to S0-encapsulated Basic Get with a level that increases with each request
				let queryCount = 0;
				const respondToS0BasicGet: MockNodeBehavior = {
					async onControllerFrame(controller, self, frame) {
						if (
							frame.type === MockZWaveFrameType.Request &&
							frame.payload instanceof
								SecurityCCCommandEncapsulation &&
							frame.payload.encapsulated instanceof BasicCCGet
						) {
							// Introduce a delay in the response for the second query (after interview)
							// so we can simulate the other node interfering
							queryCount++;
							if (queryCount === 2) {
								await wait(750);
							}

							const nonceGet = new SecurityCCNonceGet(self.host, {
								nodeId: controller.host.ownNodeId,
							});
							await self.sendToController(
								createMockZWaveRequestFrame(nonceGet, {
									ackRequested: false,
								}),
							);

							const nonceReport =
								await self.expectControllerFrame(
									1000,
									(
										resp,
									): resp is MockZWaveFrame & {
										type: MockZWaveFrameType.Request;
										payload: SecurityCCNonceReport;
									} =>
										resp.type ===
											MockZWaveFrameType.Request &&
										resp.payload instanceof
											SecurityCCNonceReport,
								);
							const receiverNonce = nonceReport.payload.nonce;

							const response = new BasicCCReport(self.host, {
								nodeId: controller.host.ownNodeId,
								currentValue: queryCount,
							});
							const cc = SecurityCC.encapsulate(
								self.host,
								response,
							);
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
				mockNode.defineBehavior(respondToS0BasicGet);

				// Parse Security CC commands. This MUST be defined last, since defineBehavior will prepend it to the list
				const parseS0CC: MockNodeBehavior = {
					async onControllerFrame(controller, self, frame) {
						// We don't support sequenced commands here
						if (
							frame.type === MockZWaveFrameType.Request &&
							frame.payload instanceof
								SecurityCCCommandEncapsulation
						) {
							frame.payload.mergePartialCCs(undefined as any, []);
						}
						// This just decodes - we need to call further handlers
						return false;
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
			const nonceGet = new SecurityCCNonceGet(mockNode3.host, {
				nodeId: mockController.host.ownNodeId,
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
					} =>
						resp.type === MockZWaveFrameType.Request &&
						resp.payload instanceof SecurityCCNonceReport,
				)
				.catch(() => {
					throw new Error(
						"The controller did not reply to the Nonce Get ASAP",
					);
				});

			t.is((await basicGet)?.currentValue, 2);

			t.pass();
		},
	},
);
