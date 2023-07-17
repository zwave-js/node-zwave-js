import {
	BasicCCSet,
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
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest("communication via Security S0 works", {
	debug: true,

	// We need the cache to skip the CC interviews and mark S2 as supported
	provisioningDirectory: path.join(__dirname, "fixtures/s0Encapsulation"),

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
					frame.payload instanceof SecurityCCCommandEncapsulation &&
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

					const nonceReport = await self.expectControllerFrame(
						1000,
						(
							resp,
						): resp is MockZWaveFrame & {
							type: MockZWaveFrameType.Request;
							payload: SecurityCCNonceReport;
						} =>
							resp.type === MockZWaveFrameType.Request &&
							resp.payload instanceof SecurityCCNonceReport,
					);
					const receiverNonce = nonceReport.payload.nonce;

					const response = new SecurityCCCommandsSupportedReport(
						self.host,
						{
							nodeId: controller.host.ownNodeId,
							supportedCCs: [CommandClasses.Basic],
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
		mockNode.defineBehavior(respondToS0CommandsSupportedGet);

		// Parse Security CC commands. This MUST be defined last, since defineBehavior will prepend it to the list
		const parseS0CC: MockNodeBehavior = {
			async onControllerFrame(controller, self, frame) {
				// We don't support sequenced commands here
				if (
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof SecurityCCCommandEncapsulation
				) {
					frame.payload.mergePartialCCs(undefined as any, []);
				}
				// This just decodes - we need to call further handlers
				return false;
			},
		};
		mockNode.defineBehavior(parseS0CC);
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		await node.commandClasses.Basic.set(0x55);

		await wait(100);
		mockNode.assertReceivedControllerFrame(
			(f) =>
				f.type === MockZWaveFrameType.Request &&
				f.payload instanceof SecurityCCCommandEncapsulation &&
				f.payload.encapsulated instanceof BasicCCSet &&
				f.payload.encapsulated.targetValue === 0x55,
		);

		t.pass();
	},
});
