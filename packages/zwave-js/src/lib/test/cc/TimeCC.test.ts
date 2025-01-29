import {
	CommandClass,
	TimeCC,
	TimeCCDateGet,
	TimeCCDateReport,
	TimeCCTimeGet,
	TimeCCTimeReport,
	TimeCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses.Time, // CC
		]),
		payload,
	]);
}

test("the TimeGet command should serialize correctly", async (t) => {
	const cc = new TimeCCTimeGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			TimeCommand.TimeGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the TimeReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			TimeCommand.TimeReport, // CC Command
			14,
			23,
			59,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 8 } as any,
	) as TimeCCTimeReport;
	t.expect(cc.constructor).toBe(TimeCCTimeReport);

	t.expect(cc.hour).toBe(14);
	t.expect(cc.minute).toBe(23);
	t.expect(cc.second).toBe(59);
});

test("the DateGet command should serialize correctly", async (t) => {
	const cc = new TimeCCDateGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			TimeCommand.DateGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the DateReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			TimeCommand.DateReport, // CC Command
			0x07,
			0xc5,
			10,
			17,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 8 } as any,
	) as TimeCCDateReport;
	t.expect(cc.constructor).toBe(TimeCCDateReport);

	t.expect(cc.year).toBe(1989);
	t.expect(cc.month).toBe(10);
	t.expect(cc.day).toBe(17);
});

test("deserializing an unsupported command should return an unspecified version of TimeCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 8 } as any,
	) as TimeCC;
	t.expect(cc.constructor).toBe(TimeCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.Time,
// 		"currentValue",
// 	);
// 	t.like(currentValueMeta, {
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
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
