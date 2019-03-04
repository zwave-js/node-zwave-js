// tslint:disable:no-unused-expression

import { assertZWaveError } from "../../../test/util";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { BasicCC, BasicCommand } from "./BasicCC";
import { CommandClasses } from "./CommandClass";

describe("lib/commandclass/BasicCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const basicCC = new BasicCC(undefined, 1, BasicCommand.Get);
		const expected = Buffer.from([
			1, // node number
			2, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Get, // CC Command
		]);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const basicCC = new BasicCC(undefined, 2, BasicCommand.Set, 55);
		const expected = Buffer.from([
			2, // node number
			3, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Set, // CC Command
			55, // target value
		]);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("serialize() should throw for other commands", () => {
		const basicCC = new BasicCC(undefined, 2, -1 /* not a command */);

		assertZWaveError(
			() => basicCC.serialize(), {
				messageMatches: "Cannot serialize",
				errorCode: ZWaveErrorCodes.CC_Invalid,
			},
		);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = Buffer.from([
			2, // node number
			3, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Report, // CC Command
			55, // current value
		]);
		const basicCC = new BasicCC(undefined);
		basicCC.deserialize(ccData);

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBeUndefined;
		expect(basicCC.duration).toBeUndefined;
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = Buffer.from([
			2, // node number
			5, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Report, // CC Command
			55, // current value
			66, // target value
			1, // duration
		]);
		const basicCC = new BasicCC(undefined);
		basicCC.deserialize(ccData);

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBe(66);
		expect(basicCC.duration).toBe(1);
	});

	it("deserialize() should throw for other commands", () => {
		const serializedCC = Buffer.from([
			2, // node number
			2, // remaining length
			CommandClasses.Basic, // CC
			255, // not a valid command
		]);
		const basicCC = new BasicCC(undefined);

		assertZWaveError(
			() => basicCC.deserialize(serializedCC), {
				messageMatches: "Cannot deserialize",
				errorCode: ZWaveErrorCodes.CC_Invalid,
			},
		);
	});

});
