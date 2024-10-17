import {
	MultilevelSwitchCC,
	MultilevelSwitchCCGet,
	MultilevelSwitchCCReport,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCStartLevelChange,
	MultilevelSwitchCCStopLevelChange,
	MultilevelSwitchCCSupportedGet,
	MultilevelSwitchCommand,
} from "@zwave-js/cc";
import { CommandClasses, Duration } from "@zwave-js/core";
import { type GetSupportedCCVersion } from "@zwave-js/host";
import test from "ava";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Multilevel Switch"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly (no duration)", (t) => {
	const cc = new MultilevelSwitchCCSet({
		nodeId: 2,
		targetValue: 55,
	});
	const expected = buildCCBuffer(
		Buffer.from([
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

	t.deepEqual(cc.serialize(ctx), expected);
});

test("the Set command (V2) should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCSet({
		nodeId: 2,
		targetValue: 55,
		duration: new Duration(2, "minutes"),
	});
	const expected = buildCCBuffer(
		Buffer.from([
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

	t.deepEqual(cc.serialize(ctx), expected);
});

test("the Report command (V1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.Report, // CC Command
			55, // current value
		]),
	);
	const cc = new MultilevelSwitchCCReport({
		nodeId: 2,
		data: ccData,
		context: {} as any,
	});

	t.is(cc.currentValue, 55);
	t.is(cc.targetValue, undefined);
	t.is(cc.duration, undefined);
});

test("the Report command (v4) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.Report, // CC Command
			55, // current value
			66, // target value
			1, // duration
		]),
	);
	const cc = new MultilevelSwitchCCReport({
		nodeId: 2,
		data: ccData,
		context: {} as any,
	});

	t.is(cc.currentValue, 55);
	t.is(cc.targetValue, 66);
	t.is(cc.duration!.unit, "seconds");
	t.is(cc.duration!.value, 1);
});

test("the StopLevelChange command should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCStopLevelChange({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.StopLevelChange, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the StartLevelChange command (V2) should serialize correctly (down, ignore start level, with duration)", (t) => {
	const cc = new MultilevelSwitchCCStartLevelChange({
		nodeId: 2,
		direction: "down",
		ignoreStartLevel: true,
		startLevel: 50,
		duration: new Duration(3, "seconds"),
	});
	const expected = buildCCBuffer(
		Buffer.from([
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

	t.deepEqual(cc.serialize(ctx), expected);
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCSupportedGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("deserializing an unsupported command should return an unspecified version of MultilevelSwitchCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new MultilevelSwitchCC({
		nodeId: 2,
		data: serializedCC,
		context: {} as any,
	});
	t.is(cc.constructor, MultilevelSwitchCC);
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
