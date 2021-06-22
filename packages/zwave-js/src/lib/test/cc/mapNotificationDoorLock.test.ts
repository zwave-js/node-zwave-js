import { CommandClasses } from "@zwave-js/core";
import {
	DoorLockMode,
	getCurrentModeValueId as getCurrentLockModeValueId,
} from "../../commandclass/DoorLockCC";
import { NotificationCCReport } from "../../commandclass/NotificationCC";
import type { ThrowingMap } from "../../controller/Controller";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";

describe("map Notification CC to Door Lock CC", () => {
	let driver: Driver;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		// Loading configuration may take a while on CI
		if (process.env.CI) jest.setTimeout(30000);

		({ driver } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			isFunctionSupported: () => true,
			nodes: new Map(),
			incrementStatistics: () => {},
		} as any;
		await driver.configManager.loadNotifications();
	});

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
