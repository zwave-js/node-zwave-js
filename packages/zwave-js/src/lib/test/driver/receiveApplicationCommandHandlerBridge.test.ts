import { SecurityCCNonceReport } from "@zwave-js/cc";
import { CommandClasses, SecurityManager } from "@zwave-js/core";
import {
	BridgeApplicationCommandRequest,
	FunctionType,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";
import {
	getDefaultMockControllerCapabilities,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"Node responses in a BridgeApplicationCommandRequest should be understood",
	{
		// Repro for #1100 - Z-Wave JS uses SendData, the controller responds with
		// BridgeApplicationCommandRequest

		// debug: true,

		// The controller does not support the bridge API
		controllerCapabilities: {
			...getDefaultMockControllerCapabilities(),
			supportedFunctionTypes: getDefaultSupportedFunctionTypes().filter(
				(ft) =>
					ft !== FunctionType.SendDataBridge
					&& ft !== FunctionType.SendDataMulticastBridge,
			),
		},

		nodeCapabilities: {
			commandClasses: [CommandClasses.Security],
		},

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
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
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			node.addCC(CommandClasses.Security, {
				isSupported: true,
				version: 1,
			});

			const noncePromise = node.commandClasses.Security.getNonce();
			const expectedNonce = Uint8Array.from(
				Bytes.from("3e55e4b714973b9e", "hex"),
			);

			const nonceReport = new SecurityCCNonceReport({
				nodeId: node.id,
				nonce: expectedNonce,
			});
			const response = new BridgeApplicationCommandRequest({
				command: nonceReport,
				frameType: "singlecast",
				ownNodeId: mockController.ownNodeId,
				fromForeignHomeId: false,
				isExploreFrame: false,
				isForeignFrame: false,
				routedBusy: false,
				nodeId: node.id,
				targetNodeId: mockController.ownNodeId,
			});

			mockController.sendMessageToHost(response, mockNode);

			const nonce = Uint8Array.from((await noncePromise)!);
			t.expect(nonce).toStrictEqual(expectedNonce);
		},
	},
);
