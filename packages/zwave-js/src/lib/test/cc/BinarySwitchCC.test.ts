import {
	BinarySwitchCC,
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCSet,
	BinarySwitchCommand,
} from "@zwave-js/cc";
import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Binary Switch"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new BinarySwitchCCGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			BinarySwitchCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command (v1) should serialize correctly", (t) => {
	const cc = new BinarySwitchCCSet(host, {
		nodeId: 2,
		targetValue: false,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			BinarySwitchCommand.Set, // CC Command
			0x00, // target value
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command (v2) should serialize correctly", (t) => {
	const duration = new Duration(2, "minutes");
	const cc = new BinarySwitchCCSet(host, {
		nodeId: 2,
		targetValue: true,
		duration,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			BinarySwitchCommand.Set, // CC Command
			0xff, // target value,
			duration.serializeSet(),
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BinarySwitchCommand.Report, // CC Command
			0xff, // current value
		]),
	);
	const cc = new BinarySwitchCCReport(host, {
		nodeId: 2,
		data: ccData,
	});

	t.is(cc.currentValue, true);
	t.is(cc.targetValue, undefined);
	t.is(cc.duration, undefined);
});

test("the Report command (v2) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BinarySwitchCommand.Report, // CC Command
			0xff, // current value
			0x00, // target value
			1, // duration
		]),
	);
	const cc = new BinarySwitchCCReport(host, {
		nodeId: 2,
		data: ccData,
	});

	t.is(cc.currentValue, true);
	t.is(cc.targetValue, false);
	t.is(cc.duration!.unit, "seconds");
	t.is(cc.duration!.value, 1);
});

test("deserializing an unsupported command should return an unspecified version of BinarySwitchCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new BinarySwitchCC(host, {
		nodeId: 2,
		data: serializedCC,
	});
	t.is(cc.constructor, BinarySwitchCC);
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
