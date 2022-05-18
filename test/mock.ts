/* eslint-disable @typescript-eslint/require-await */
import { MockController, MockNode } from "@zwave-js/testing";
import path from "path";
import "reflect-metadata";
import {
	createAndStartDriverWithMockPort,
	createDefaultMockControllerBehaviors,
} from "zwave-js";

process.on("unhandledRejection", (_r) => {
	debugger;
});

void (async () => {
	const { driver, continueStartup, mockPort } =
		await createAndStartDriverWithMockPort("/tty/FAKE", {
			logConfig: {
				// 	logToFile: true,
				enabled: true,
				level: "debug",
			},
			securityKeys: {
				S0_Legacy: Buffer.from(
					"0102030405060708090a0b0c0d0e0f10",
					"hex",
				),
				S2_Unauthenticated: Buffer.from(
					"5F103E487B11BE72EE5ED3F6961B0B46",
					"hex",
				),
				S2_Authenticated: Buffer.from(
					"7666D813DEB4DD0FFDE089A38E883699",
					"hex",
				),
				S2_AccessControl: Buffer.from(
					"92901F4D820FF38A999A751914D1A2BA",
					"hex",
				),
			},
			storage: {
				cacheDir: path.join(__dirname, "cache"),
				lockDir: path.join(__dirname, "cache/locks"),
			},
		});
	driver.on("error", console.error);
	driver.once("driver ready", async () => {
		// Test code
		console.log("driver ready!!!");
	});

	const controller = new MockController({
		homeId: 0x7e370001,
		ownNodeId: 1,
		serial: mockPort,
	});

	const node2 = new MockNode({
		id: 2,
		controller,
		capabilities: {
			isListening: false,
		},
	});
	controller.nodes.set(2, node2);

	// Apply default behaviors that are required for interacting with the driver correctly
	controller.defineBehavior(...createDefaultMockControllerBehaviors());

	continueStartup();
})();
