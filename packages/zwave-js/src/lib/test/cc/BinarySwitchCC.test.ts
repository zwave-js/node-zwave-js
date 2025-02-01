import {
	BinarySwitchCC,
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCSet,
	BinarySwitchCommand,
	CommandClass,
} from "@zwave-js/cc";
import {
	CommandClasses,
	Duration,
	type GetSupportedCCVersion,
} from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Binary Switch"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new BinarySwitchCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			BinarySwitchCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command should serialize correctly (no duration)", async (t) => {
	const cc = new BinarySwitchCCSet({
		nodeId: 2,
		targetValue: false,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			BinarySwitchCommand.Set, // CC Command
			0x00, // target value
			0xff, // default duration
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 1;
		},
	} satisfies GetSupportedCCVersion as any;

	await t.expect(cc.serialize(ctx)).resolves.toStrictEqual(expected);
});

test("the Set command should serialize correctly", async (t) => {
	const duration = new Duration(2, "minutes");
	const cc = new BinarySwitchCCSet({
		nodeId: 2,
		targetValue: true,
		duration,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			BinarySwitchCommand.Set, // CC Command
			0xff, // target value,
			duration.serializeSet(),
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 2;
		},
	} satisfies GetSupportedCCVersion as any;

	await t.expect(cc.serialize(ctx)).resolves.toStrictEqual(expected);
});

test("the Report command (v1) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BinarySwitchCommand.Report, // CC Command
			0xff, // current value
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BinarySwitchCCReport;
	t.expect(cc.constructor).toBe(BinarySwitchCCReport);

	t.expect(cc.currentValue).toBe(true);
	t.expect(cc.targetValue).toBeUndefined();
	t.expect(cc.duration).toBeUndefined();
});

test("the Report command (v2) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BinarySwitchCommand.Report, // CC Command
			0xff, // current value
			0x00, // target value
			1, // duration
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BinarySwitchCCReport;
	t.expect(cc.constructor).toBe(BinarySwitchCCReport);

	t.expect(cc.currentValue).toBe(true);
	t.expect(cc.targetValue).toBe(false);
	t.expect(cc.duration!.unit).toBe("seconds");
	t.expect(cc.duration!.value).toBe(1);
});

test("deserializing an unsupported command should return an unspecified version of BinarySwitchCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 2 } as any,
	) as BinarySwitchCC;
	t.expect(cc.constructor).toBe(BinarySwitchCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.BinarySwitch,
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
// 		CommandClasses.BinarySwitch,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
