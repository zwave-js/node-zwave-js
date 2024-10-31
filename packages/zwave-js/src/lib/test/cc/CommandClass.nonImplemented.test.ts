import { CommandClass } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"the CC constructor does not throw when creating a raw instance of a non-implemented CC",
	{
		// debug: true,

		async testBody(t, driver, node, mockController, mockNode) {
			// This CC will never be supported (certification requirement)
			const cc = new CommandClass({
				nodeId: 2,
				ccId: CommandClasses["Anti-Theft"],
				ccCommand: 0x02,
			});
			await driver.sendCommand(cc);
		},
	},
);
