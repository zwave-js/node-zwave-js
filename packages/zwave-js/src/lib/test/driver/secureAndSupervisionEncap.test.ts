import { SecurityCCNonceGet } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import path from "node:path";
import { SendDataRequest } from "../../serialapi/transport/SendDataMessages";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"secure encapsulation should be used when encapsulated command requires it",
	{
		// debug: true,
		// We need the cache to skip the CC interviews and mark S0 as supported
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/secureAndSupervisionEncap",
		),

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses["Multilevel Switch"],
					isSupported: true,
					version: 4,
					secure: true,
				},
				{
					ccId: CommandClasses.Supervision,
					isSupported: true,
					secure: false,
				},
				{
					ccId: CommandClasses.Security,
					isSupported: true,
					version: 1,
				},
			],
		},

		testBody: async (t, driver, node, mockController, _mockNode) => {
			await node.commandClasses["Multilevel Switch"].startLevelChange({
				direction: "up",
				ignoreStartLevel: true,
			});

			// We take the driver asking for a nonce for a sign that it correctly identified the CC as needing S0
			mockController.assertReceivedHostMessage(
				(msg) =>
					msg instanceof SendDataRequest
					&& msg.command instanceof SecurityCCNonceGet,
				{
					errorMessage:
						"The driver should have sent an S0-encapsulated command",
				},
			);

			t.pass();
		},
	},
);
