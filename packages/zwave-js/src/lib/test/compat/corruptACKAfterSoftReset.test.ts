import { integrationTest } from "../integrationTestSuite";

// Repro for https://github.com/zwave-js/node-zwave-js/issues/6399

integrationTest(
	"Accept corrupted ACKs with a random high nibble after Soft Reset",
	{
		debug: true,

		controllerCapabilities: {
			libraryVersion: "Z-Wave 7.19.1",
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			mockController.clearReceivedHostMessages();

			mockController.corruptACK = true;
			await t.notThrowsAsync(driver.softReset());
			mockController.corruptACK = false;
		},
	},
);
