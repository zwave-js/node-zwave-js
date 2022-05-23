import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	TimeCC,
	TimeCCDateGet,
	TimeCCDateReport,
	TimeCCTimeGet,
	TimeCCTimeReport,
} from "./TimeCC";
import { TimeCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Time, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/TimeCC => ", () => {
	it("the TimeGet command should serialize correctly", () => {
		const cc = new TimeCCTimeGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				TimeCommand.TimeGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the TimeReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				TimeCommand.TimeReport, // CC Command
				14,
				23,
				59,
			]),
		);
		const cc = new TimeCCTimeReport(host, {
			nodeId: 8,
			data: ccData,
		});

		expect(cc.hour).toBe(14);
		expect(cc.minute).toBe(23);
		expect(cc.second).toBe(59);
	});

	it("the DateGet command should serialize correctly", () => {
		const cc = new TimeCCDateGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				TimeCommand.DateGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the DateReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				TimeCommand.DateReport, // CC Command
				0x07,
				0xc5,
				10,
				17,
			]),
		);
		const cc = new TimeCCDateReport(host, {
			nodeId: 8,
			data: ccData,
		});

		expect(cc.year).toBe(1989);
		expect(cc.month).toBe(10);
		expect(cc.day).toBe(17);
	});

	it("deserializing an unsupported command should return an unspecified version of TimeCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new TimeCC(host, {
			nodeId: 8,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(TimeCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.Time,
	// 		"currentValue",
	// 	);
	// 	expect(currentValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: false,
	// 		min: 0,
	// 		max: 99,
	// 	});

	// 	// Writeable, 0-99
	// 	const targetValueMeta = getCCValueMetadata(
	// 		CommandClasses.Time,
	// 		"targetValue",
	// 	);
	// 	expect(targetValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: true,
	// 		min: 0,
	// 		max: 99,
	// 	});
	// });
});
