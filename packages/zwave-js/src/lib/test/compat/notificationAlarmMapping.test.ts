import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import { CommandClass } from "../../commandclass";
import {
	getManufacturerIdValueId,
	getProductIdValueId,
	getProductTypeValueId,
} from "../../commandclass/ManufacturerSpecificCC";
import { NotificationCCReport } from "../../commandclass/NotificationCC";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

describe("compat flags", () => {
	let driver: Driver;
	let node2: ZWaveNode;
	let controller: MockController;

	beforeAll(async () => {
		({ driver } = await createAndStartTestingDriver({
			skipNodeInterview: true,
			beforeStartup(mockPort) {
				controller = new MockController({ serial: mockPort });
				controller.defineBehavior(
					...createDefaultMockControllerBehaviors(),
				);
			},
		}));
		node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			node2.id,
			node2,
		);

		node2.addCC(CommandClasses.Notification, {
			isSupported: true,
			version: 1,
		});
	}, 30000);

	afterAll(async () => {
		await driver.destroy();
	});

	it("the alarmMapping compat flag works correctly (using the example Kwikset 910)", async () => {
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
	}, 30000);
});
