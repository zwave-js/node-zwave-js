import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import { getCurrentModeValueId as getCurrentLockModeValueId } from "../../commandclass/DoorLockCC";
import { NotificationCCReport } from "../../commandclass/NotificationCC";
import { DoorLockMode } from "../../commandclass/_Types";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

describe("map Notification CC to Door Lock CC", () => {
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

		node2.addCC(CommandClasses["Door Lock"], {
			isSupported: true,
		});
		node2.addCC(CommandClasses.Notification, {
			isSupported: true,
			version: 8,
		});
	}, 30000);

	afterAll(async () => {
		await driver.destroy();
	});

	it("When receiving a NotificationCC::Report with a lock operation, the current value for Door Lock CC should be updated accordingly", () => {
		const valueId = getCurrentLockModeValueId(0);

		let cmd = new NotificationCCReport(driver, {
			nodeId: node2.id,
			notificationType: 0x06, // Access Control,
			notificationEvent: 0x01, // Manual Lock Operation
		});
		node2.handleCommand(cmd);

		expect(node2.getValue(valueId)).toEqual(DoorLockMode.Secured);

		cmd = new NotificationCCReport(driver, {
			nodeId: node2.id,
			notificationType: 0x06, // Access Control,
			notificationEvent: 0x06, // Keypad Unlock Operation
		});
		node2.handleCommand(cmd);

		expect(node2.getValue(valueId)).toEqual(DoorLockMode.Unsecured);
	});
});
