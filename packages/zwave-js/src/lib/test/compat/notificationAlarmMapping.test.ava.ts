import { CommandClass } from "@zwave-js/cc";
import { ManufacturerSpecificCCValues } from "@zwave-js/cc/ManufacturerSpecificCC";
import { NotificationCCReport } from "@zwave-js/cc/NotificationCC";
import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

interface TestContext {
	driver: Driver;
	node2: ZWaveNode;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	t.timeout(30000);

	const { driver } = await createAndStartTestingDriver({
		skipNodeInterview: true,
		beforeStartup(mockPort) {
			const controller = new MockController({ serial: mockPort });
			controller.defineBehavior(
				...createDefaultMockControllerBehaviors(),
			);
			t.context.controller = controller;
		},
	});

	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node2.id,
		node2,
	);

	node2.addCC(CommandClasses.Notification, {
		isSupported: true,
		version: 1,
	});

	t.context.driver = driver;
	t.context.node2 = node2;
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test("the alarmMapping compat flag works correctly (using the example Kwikset 910)", async (t) => {
	const { driver, node2 } = t.context;

	node2.valueDB.setValue(
		ManufacturerSpecificCCValues.manufacturerId.id,
		0x90,
	);
	node2.valueDB.setValue(ManufacturerSpecificCCValues.productType.id, 0x01);
	node2.valueDB.setValue(ManufacturerSpecificCCValues.productId.id, 0x01);
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

	// Call persistValues to trigger the mapping
	deserialized.persistValues(driver);

	// Keypad lock
	t.is(deserialized.notificationType, 0x06);
	t.is(deserialized.notificationEvent, 0x05);
	t.deepEqual(deserialized.eventParameters, {
		userId: 2,
	});
});
