import {
	BasicCC,
	BasicCCGet,
	BasicCCReport,
	BasicCCSet,
	BasicCommand,
} from "./BasicCC";
import { CommandClasses } from "./CommandClasses";

describe("lib/commandclass/BasicCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const basicCC = new BasicCCGet(undefined as any, { nodeId: 1 });
		const expected = Buffer.from([
			1, // node number
			2, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Get, // CC Command
		]);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const basicCC = new BasicCCSet(undefined as any, {
			nodeId: 2,
			targetValue: 55,
		});
		const expected = Buffer.from([
			2, // node number
			3, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Set, // CC Command
			55, // target value
		]);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = Buffer.from([
			2, // node number
			3, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Report, // CC Command
			55, // current value
		]);
		const basicCC = new BasicCCReport(undefined as any, { data: ccData });

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBeUndefined();
		expect(basicCC.duration).toBeUndefined();
	});

	it("the Report command (v2) should be deserialized correctly", () => {
		const ccData = Buffer.from([
			2, // node number
			5, // remaining length
			CommandClasses.Basic, // CC
			BasicCommand.Report, // CC Command
			55, // current value
			66, // target value
			1, // duration
		]);
		const basicCC = new BasicCCReport(undefined as any, { data: ccData });

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBe(66);
		expect(basicCC.duration!.unit).toBe("seconds");
		expect(basicCC.duration!.value).toBe(1);
	});

	it("deserializing an unsupported command should return an unspecified version of BasicCC", () => {
		const serializedCC = Buffer.from([
			2, // node number
			2, // remaining length
			CommandClasses.Basic, // CC
			255, // not a valid command
		]);
		const basicCC: any = new BasicCC(undefined as any, {
			data: serializedCC,
		});
		expect(basicCC.constructor).toBe(BasicCC);
	});
});
