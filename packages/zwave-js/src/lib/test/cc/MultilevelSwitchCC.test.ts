import {
	CommandClass,
	MultilevelSwitchCC,
	MultilevelSwitchCCGet,
	MultilevelSwitchCCReport,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCStartLevelChange,
	MultilevelSwitchCCStopLevelChange,
	MultilevelSwitchCCSupportedGet,
	MultilevelSwitchCommand,
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
			CommandClasses["Multilevel Switch"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new MultilevelSwitchCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command should serialize correctly (no duration)", async (t) => {
	const cc = new MultilevelSwitchCCSet({
		nodeId: 2,
		targetValue: 55,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.Set, // CC Command
			55, // target value,
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

test("the Set command (V2) should serialize correctly", async (t) => {
	const cc = new MultilevelSwitchCCSet({
		nodeId: 2,
		targetValue: 55,
		duration: new Duration(2, "minutes"),
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.Set, // CC Command
			55, // target value,
			0x81, // 2 minutes
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 2;
		},
	} satisfies GetSupportedCCVersion as any;

	await t.expect(cc.serialize(ctx)).resolves.toStrictEqual(expected);
});

test("the Report command (V1) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.Report, // CC Command
			55, // current value
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as MultilevelSwitchCCReport;
	t.expect(cc.constructor).toBe(MultilevelSwitchCCReport);

	t.expect(cc.currentValue).toBe(55);
	t.expect(cc.targetValue).toBeUndefined();
	t.expect(cc.duration).toBeUndefined();
});

test("the Report command (v4) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.Report, // CC Command
			55, // current value
			66, // target value
			1, // duration
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as MultilevelSwitchCCReport;
	t.expect(cc.constructor).toBe(MultilevelSwitchCCReport);

	t.expect(cc.currentValue).toBe(55);
	t.expect(cc.targetValue).toBe(66);
	t.expect(cc.duration!.unit).toBe("seconds");
	t.expect(cc.duration!.value).toBe(1);
});

test("the StopLevelChange command should serialize correctly", async (t) => {
	const cc = new MultilevelSwitchCCStopLevelChange({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.StopLevelChange, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the StartLevelChange command (V2) should serialize correctly (down, ignore start level, with duration)", async (t) => {
	const cc = new MultilevelSwitchCCStartLevelChange({
		nodeId: 2,
		direction: "down",
		ignoreStartLevel: true,
		startLevel: 50,
		duration: new Duration(3, "seconds"),
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.StartLevelChange, // CC Command
			0b011_00000, // down, ignore start level
			50, // start level
			3, // 3 sec
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 2;
		},
	} satisfies GetSupportedCCVersion as any;

	await t.expect(cc.serialize(ctx)).resolves.toStrictEqual(expected);
});

test("the SupportedGet command should serialize correctly", async (t) => {
	const cc = new MultilevelSwitchCCSupportedGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			MultilevelSwitchCommand.SupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("deserializing an unsupported command should return an unspecified version of MultilevelSwitchCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 2 } as any,
	) as MultilevelSwitchCC;
	t.expect(cc.constructor).toBe(MultilevelSwitchCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.MultilevelSwitch,
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
// 		CommandClasses.MultilevelSwitch,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
