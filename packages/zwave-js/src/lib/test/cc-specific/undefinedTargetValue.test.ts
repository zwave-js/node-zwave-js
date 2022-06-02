import {
	BinarySwitchCommand,
	CommandClass,
	getCommandClassStatic,
} from "@zwave-js/cc";
import {
	BinarySwitchCC,
	BinarySwitchCCReport,
} from "@zwave-js/cc/BinarySwitchCC";
import { CommandClasses, ValueID } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

describe("regression tests", () => {
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

		node2.addCC(CommandClasses["Binary Switch"], {
			isSupported: true,
			version: 2,
		});
	}, 30000);

	afterAll(async () => {
		await driver.destroy();
	});

	it("receiving a BinarySwitchCC::Report with undefined targetValue should not delete the actual targetValue", async () => {
		const targetValueValueID: ValueID = {
			commandClass: CommandClasses["Binary Switch"],
			property: "targetValue",
		};
		node2.valueDB.setValue(targetValueValueID, false);

		const data = Buffer.from([
			getCommandClassStatic(BinarySwitchCC),
			BinarySwitchCommand.Report,
			0xff, // currentValue
		]);
		const cc = CommandClass.from(driver, {
			nodeId: 2,
			data,
		}) as BinarySwitchCCReport;
		expect(cc).toBeInstanceOf(BinarySwitchCCReport);
		expect(cc.targetValue).toBe(undefined);

		// The value in the DB should not be changed because we have no new info
		expect(node2.getValue(targetValueValueID)).toBe(false);
	});
});
