/* eslint-disable @typescript-eslint/require-await */
import { CommandClasses, SupervisionStatus } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockController,
	MockNode,
	MockNodeBehavior,
	MockZWaveFrameType,
} from "@zwave-js/testing";
import path from "path";
import "reflect-metadata";
import {
	createAndStartDriverWithMockPort,
	createDefaultMockControllerBehaviors,
	createDefaultMockNodeBehaviors,
	SupervisionCCGet,
	SupervisionCCReport,
} from "zwave-js";

process.on("unhandledRejection", (_r) => {
	debugger;
});

void (async () => {
	const { driver, continueStartup, mockPort } =
		await createAndStartDriverWithMockPort({
			portAddress: "/tty/FAKE",
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

	const controller = new MockController({
		homeId: 0x7e370001,
		ownNodeId: 1,
		serial: mockPort,
	});

	const mockNode2 = new MockNode({
		id: 2,
		controller,
		capabilities: {
			isListening: true,
			commandClasses: [
				CommandClasses.Basic,
				CommandClasses["Binary Switch"],
				CommandClasses.Supervision,
			],
			endpoints: [{ commandClasses: [CommandClasses.Basic] }],
		},
	});
	controller.addNode(mockNode2);

	// node2.autoAckControllerFrames = false;

	// Apply default behaviors that are required for interacting with the driver correctly
	controller.defineBehavior(...createDefaultMockControllerBehaviors());
	mockNode2.defineBehavior(...createDefaultMockNodeBehaviors());

	const respondToSupervisionGet: MockNodeBehavior = {
		async onControllerFrame(controller, self, frame) {
			if (
				frame.type === MockZWaveFrameType.Request &&
				frame.payload instanceof SupervisionCCGet
			) {
				const cc = new SupervisionCCReport(controller.host, {
					nodeId: self.id,
					sessionId: frame.payload.sessionId,
					moreUpdatesFollow: false,
					status: SupervisionStatus.Success,
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
	mockNode2.defineBehavior(respondToSupervisionGet);

	driver.once("driver ready", () => {
		// Test code goes here

		const node2 = driver.controller.nodes.getOrThrow(2);
		node2.on("ready", async () => {
			await node2.commandClasses["Binary Switch"].set(true);
		});
	});

	continueStartup();
})();
