import { createEmptyMockDriver } from "../../../test/mocks";
import {
	BatteryCC,
	BatteryCCGet,
	BatteryCCReport,
	BatteryCommand,
} from "./BatteryCC";
import { CommandClasses } from "./CommandClasses";

const fakeDriver = createEmptyMockDriver();

describe("lib/commandclass/BatteryCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const batteryCC = new BatteryCCGet(fakeDriver, { nodeId: 1 });
		const expected = Buffer.from([
			1, // node number
			2, // remaining length
			CommandClasses.Battery, // CC
			BatteryCommand.Get, // CC Command
		]);
		expect(batteryCC.serialize()).toEqual(expected);
	});

	describe("the Report command (v1) should be deserialized correctly", () => {
		it("when the battery is not low", () => {
			const ccData = Buffer.from([
				2, // node number
				3, // remaining length
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				55, // current value
			]);
			const batteryCC = new BatteryCC(fakeDriver, {
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.level).toBe(55);
			expect(batteryCC.isLow).toBeFalse();
		});

		it("when the battery is low", () => {
			const ccData = Buffer.from([
				2, // node number
				3, // remaining length
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				0xff, // current value
			]);
			const batteryCC = new BatteryCC(fakeDriver, {
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.level).toBe(0);
			expect(batteryCC.isLow).toBeTrue();
		});
	});

	it("deserializing an unsupported command should return an unspecified version of BatteryCC", () => {
		const serializedCC = Buffer.from([
			2, // node number
			2, // remaining length
			CommandClasses.Battery, // CC
			255, // not a valid command
		]);
		const basicCC: any = new BatteryCC(fakeDriver, {
			data: serializedCC,
		});
		expect(basicCC.constructor).toBe(BatteryCC);
	});
});
