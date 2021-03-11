import { CommandClasses } from "@zwave-js/core";
import { CommandClass } from "../../commandclass";
import {
	getManufacturerIdValueId,
	getProductIdValueId,
	getProductTypeValueId,
} from "../../commandclass/ManufacturerSpecificCC";
import { NotificationCCReport } from "../../commandclass/NotificationCC";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";

describe("compat flags", () => {
	let driver: Driver;

	beforeEach(async () => {
		({ driver } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			isFunctionSupported: () => true,
			nodes: new Map(),
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("the alarmMapping compat flag works correctly (using the example Kwikset 910)", async () => {
		jest.setTimeout(30000);

		const node2 = new ZWaveNode(2, driver);
		((driver.controller.nodes as any) as Map<number, ZWaveNode>).set(
			2,
			node2,
		);
		node2.addCC(CommandClasses.Notification, {
			isSupported: true,
			version: 1,
		});
		node2.valueDB.setValue(getManufacturerIdValueId(), 0x90);
		node2.valueDB.setValue(getProductTypeValueId(), 0x01);
		node2.valueDB.setValue(getProductIdValueId(), 0x01);
		await node2["loadDeviceConfig"]();

		const rawNotification = new NotificationCCReport(driver, {
			nodeId: 2,
			alarmType: 18,
			alarmLevel: 2,
		});
		const serialized = rawNotification.serialize();

		const deserialized = CommandClass.from(driver, {
			data: serialized,
			nodeId: 2,
		}) as NotificationCCReport;

		// Keypad lock
		expect(deserialized.notificationType).toBe(0x06);
		expect(deserialized.notificationEvent).toBe(0x05);
		expect(deserialized.eventParameters).toEqual({
			userId: 2,
		});
	});
});
