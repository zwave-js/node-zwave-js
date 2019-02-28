// tslint:disable:no-unused-expression

import { expect, should } from "chai";
import { stub } from "sinon";
should();

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
		basicCC.serialize().should.deep.equal(expected);
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
		basicCC.serialize().should.deep.equal(expected);
	});

	it("serialize() should throw for other commands", () => {
		const basicCC = new BasicCC(undefined, 2, -1 /* not a command */);
		assertZWaveError(
			() => basicCC.serialize(),
			"Cannot serialize",
			ZWaveErrorCodes.CC_Invalid,
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

		basicCC.currentValue.should.equal(55);
		expect(basicCC.targetValue).to.be.undefined;
		expect(basicCC.duration).to.be.undefined;
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

		basicCC.currentValue.should.equal(55);
		basicCC.targetValue.should.equal(66);
		basicCC.duration.should.equal(1);
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
			() => basicCC.deserialize(serializedCC),
			"Cannot deserialize",
			ZWaveErrorCodes.CC_Invalid,
		);
	});

});
