import { assertZWaveError } from "../../../test/util";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { BatteryCC, BatteryCommand } from "./BatteryCC";
import { CommandClasses } from "./CommandClasses";

describe("lib/commandclass/BatteryCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const batteryCC = new BatteryCC(undefined, 1, BatteryCommand.Get);
		const expected = Buffer.from([
			1, // node number
			2, // remaining length
			CommandClasses.Battery, // CC
			BatteryCommand.Get, // CC Command
		]);
		expect(batteryCC.serialize()).toEqual(expected);
	});

	it("serialize() should throw for other commands", () => {
		const batteryCC = new BatteryCC(undefined, 2, -1 /* not a command */);

		assertZWaveError(
			() => batteryCC.serialize(), {
				messageMatches: "Cannot serialize",
				errorCode: ZWaveErrorCodes.CC_Invalid,
			},
		);
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
			const batteryCC = new BatteryCC(undefined);
			batteryCC.deserialize(ccData);

			expect(batteryCC.level).toBe(55);
			expect(batteryCC.isLow).toBeFalse();
		});

		it("when the battery is low", () => {
			const ccData = Buffer.from([
				2, // node number
				3, // remaining length
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				0xFF, // current value
			]);
			const batteryCC = new BatteryCC(undefined);
			batteryCC.deserialize(ccData);

			expect(batteryCC.level).toBe(0);
			expect(batteryCC.isLow).toBeTrue();
		});
	});

	it("deserialize() should throw for other commands", () => {
		const serializedCC = Buffer.from([
			2, // node number
			2, // remaining length
			CommandClasses.Battery, // CC
			255, // not a valid command
		]);
		const batteryCC = new BatteryCC(undefined);

		assertZWaveError(
			() => batteryCC.deserialize(serializedCC), {
				messageMatches: "Cannot deserialize",
				errorCode: ZWaveErrorCodes.CC_Invalid,
			},
		);
	});

});
