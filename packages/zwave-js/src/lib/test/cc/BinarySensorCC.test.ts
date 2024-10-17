import {
	BinarySensorCC,
	BinarySensorCCGet,
	BinarySensorCCReport,
	BinarySensorCCSupportedGet,
	BinarySensorCCSupportedReport,
	BinarySensorCommand,
	BinarySensorType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import test from "ava";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Binary Sensor"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly (no sensor type)", (t) => {
	const cc = new BinarySensorCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			BinarySensorCommand.Get, // CC Command
			BinarySensorType.Any, // sensor type
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Get command should serialize correctly", (t) => {
	const cc = new BinarySensorCCGet({
		nodeId: 1,
		sensorType: BinarySensorType.CO,
	});
	const expected = buildCCBuffer(
		Buffer.from([BinarySensorCommand.Get, BinarySensorType.CO]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BinarySensorCommand.Report, // CC Command
			0xff, // current value
		]),
	);
	const cc = new BinarySensorCCReport({
		nodeId: 1,
		data: ccData,
		context: {} as any,
	});

	t.is(cc.value, true);
});

test("the Report command (v2) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BinarySensorCommand.Report, // CC Command
			0x00, // current value
			BinarySensorType.CO2,
		]),
	);
	const cc = new BinarySensorCCReport({
		nodeId: 1,
		data: ccData,
		context: {} as any,
	});

	t.is(cc.value, false);
	t.is(cc.type, BinarySensorType.CO2);
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new BinarySensorCCSupportedGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			BinarySensorCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the SupportedReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BinarySensorCommand.SupportedReport, // CC Command
			0b10101010,
			0b10,
		]),
	);
	const cc = new BinarySensorCCSupportedReport({
		nodeId: 1,
		data: ccData,
		context: {} as any,
	});

	t.deepEqual(cc.supportedSensorTypes, [
		BinarySensorType["General Purpose"],
		BinarySensorType.CO,
		BinarySensorType.Heat,
		BinarySensorType.Freeze,
		BinarySensorType.Aux,
	]);
});

test("deserializing an unsupported command should return an unspecified version of BinarySensorCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new BinarySensorCC({
		nodeId: 1,
		data: serializedCC,
		context: {} as any,
	});
	t.is(cc.constructor, BinarySensorCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses["Binary Sensor"],
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
// 		CommandClasses["Binary Sensor"],
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
