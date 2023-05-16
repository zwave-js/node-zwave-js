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
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Multilevel Switch"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command (V1) should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCSet(host, {
		nodeId: 2,
		targetValue: 55,
	});
	cc.version = 1;
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.Set, // CC Command
			55, // target value
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command (V2) should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCSet(host, {
		nodeId: 2,
		targetValue: 55,
		duration: new Duration(2, "minutes"),
	});
	cc.version = 2;
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.Set, // CC Command
			55, // target value,
			0x81, // 2 minutes
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command (V1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.Report, // CC Command
			55, // current value
		]),
	);
	const cc = new MultilevelSwitchCCReport(host, {
		nodeId: 2,
		data: ccData,
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
	const cc = new MultilevelSwitchCCReport(host, {
		nodeId: 2,
		data: ccData,
	});

	t.is(cc.currentValue, 55);
	t.is(cc.targetValue, 66);
	t.is(cc.duration!.unit, "seconds");
	t.is(cc.duration!.value, 1);
});

test("the StartLevelChange command (V1) should serialize correctly (up, ignore start level)", (t) => {
	const cc = new MultilevelSwitchCCStartLevelChange(host, {
		nodeId: 2,
		direction: "up",
		ignoreStartLevel: true,
	});
	cc.version = 1;
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.StartLevelChange, // CC Command
			0b001_00000, // up, ignore start level,
			0, // don't include a start level that should be ignored
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the StartLevelChange command (V1) should serialize correctly (down)", (t) => {
	const cc = new MultilevelSwitchCCStartLevelChange(host, {
		nodeId: 2,
		direction: "down",
		ignoreStartLevel: false,
		startLevel: 50,
	});
	cc.version = 1;
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.StartLevelChange, // CC Command
			0b010_00000, // down,
			50,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the StopLevelChange command should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCStopLevelChange(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.StopLevelChange, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the StartLevelChange command (V2) should serialize correctly (down, with duration)", (t) => {
	const cc = new MultilevelSwitchCCStartLevelChange(host, {
		nodeId: 2,
		direction: "down",
		ignoreStartLevel: false,
		startLevel: 50,
		duration: new Duration(3, "seconds"),
	});
	cc.version = 2;
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.StartLevelChange, // CC Command
			0b010_00000, // down,
			50, // start level
			3, // 3 sec
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new MultilevelSwitchCCSupportedGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultilevelSwitchCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("deserializing an unsupported command should return an unspecified version of MultilevelSwitchCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new MultilevelSwitchCC(host, {
		nodeId: 2,
		data: serializedCC,
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
