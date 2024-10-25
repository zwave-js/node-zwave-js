import { CommandClass } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Command classes that are not implemented are passed to awaiters before being dropped",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses.Basic,
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Anti theft will not be implemented, so we can use it to test this
			const awaited = driver.waitForCommand(
				(cc) => cc.ccId === CommandClasses["Anti-Theft"],
				1000,
			);

			const cc = new CommandClass({
				nodeId: mockController.ownNodeId,
				ccId: CommandClasses["Anti-Theft"],
				ccCommand: 0x02, // Get
				payload: Buffer.from([0x00, 0x01]), // Technically invalid
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			const result = await awaited;
			t.like(result, {
				ccId: CommandClasses["Anti-Theft"],
				ccCommand: 0x02,
				payload: Buffer.from([0x00, 0x01]),
			});
		},
	},
);
