import { CommandClasses } from "@zwave-js/core";
import { createThrowingMap, ThrowingMap } from "@zwave-js/shared";
import { getCurrentModeValueId as getCurrentLockModeValueId } from "../../commandclass/DoorLockCC";
import { NotificationCCReport } from "../../commandclass/NotificationCC";
import { DoorLockMode } from "../../commandclass/_Types";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";

describe("map Notification CC to Door Lock CC", () => {
	let driver: Driver;
	process.env.LOGLEVEL = "debug";

	beforeEach(
		async () => {
			({ driver } = await createAndStartDriver());

			driver["_controller"] = {
				ownNodeId: 1,
				isFunctionSupported: () => true,
				nodes: createThrowingMap(),
				incrementStatistics: () => {},
				removeAllListeners: () => {},
			} as any;
			await driver.configManager.loadNotifications();
		},
		// Loading configuration may take a while on CI
		30000,
	);

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("When receiving a NotificationCC::Report with a lock operation, the current value for Door Lock CC should be updated accordingly", () => {
		const node = new ZWaveNode(1, driver);
		node.addCC(CommandClasses["Door Lock"], {
			isSupported: true,
		});
		node.addCC(CommandClasses.Notification, {
			isSupported: true,
			version: 8,
		});
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			node.id,
			node,
		);

		const valueId = getCurrentLockModeValueId(0);

		let cmd = new NotificationCCReport(driver, {
			nodeId: node.id,
			notificationType: 0x06, // Access Control,
			notificationEvent: 0x01, // Manual Lock Operation
		});
		node.handleCommand(cmd);

		expect(node.getValue(valueId)).toEqual(DoorLockMode.Secured);

		cmd = new NotificationCCReport(driver, {
			nodeId: node.id,
			notificationType: 0x06, // Access Control,
			notificationEvent: 0x06, // Keypad Unlock Operation
		});
		node.handleCommand(cmd);

		expect(node.getValue(valueId)).toEqual(DoorLockMode.Unsecured);
	});
});
