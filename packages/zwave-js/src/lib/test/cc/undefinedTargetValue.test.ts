import { CommandClasses, ValueID } from "@zwave-js/core";
import {
	BinarySwitchCC,
	BinarySwitchCCReport,
	BinarySwitchCommand,
} from "../../commandclass/BinarySwitchCC";
import {
	CommandClass,
	getCommandClassStatic,
} from "../../commandclass/CommandClass";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";

describe("regression tests", () => {
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

	it("receiving a BinarySwitchCC::Report with undefined targetValue should not delete the actual targetValue", async () => {
		const node2 = new ZWaveNode(2, driver);
		node2.addCC(CommandClasses["Binary Switch"], {
			isSupported: true,
			version: 2,
		});
		(driver.controller.nodes as Map<number, ZWaveNode>).set(2, node2);

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
