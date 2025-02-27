import { Bytes } from "@zwave-js/shared";
import { type MockControllerBehavior } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { DriverMode } from "../../driver/DriverMode.js";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"The bootloader is detected when received in smaller chunks",
	{
		// Reproduction for issue #7316
		// debug: true,

		additionalDriverOptions: {
			bootloaderMode: "allow",
		},

		async customSetup(driver, mockController, mockNode) {
			const sendBootloaderMessageInChunks: MockControllerBehavior = {
				async onHostData(self, ctrl) {
					// if (
					// 	ctrl.length === 1
					// 	&& (ctrl[0] === MessageHeaders.NAK || ctrl[0] === 0x32)
					// ) {
					// I've seen logs with as few as 5 bytes in the first chunk
					self.mockPort.emitData(
						Bytes.from("\0\r\nGeck", "ascii"),
					);
					await wait(20);
					self.mockPort.emitData(Bytes.from(
						`o Bootloader v2.05.01
1. upload gbl
2. run
3. ebl info
BL >\0`,
						"ascii",
					));
					return true;
					// }
				},
			};
			mockController.defineBehavior(sendBootloaderMessageInChunks);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			t.expect(driver.mode).toBe(DriverMode.Bootloader);
		},
	},
);
