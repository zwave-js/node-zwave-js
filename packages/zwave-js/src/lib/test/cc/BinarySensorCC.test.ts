import {
	BinarySensorCC,
	BinarySensorCCGet,
	BinarySensorCCReport,
	BinarySensorCCSupportedGet,
	BinarySensorCCSupportedReport,
	BinarySensorCommand,
	BinarySensorType,
	CommandClass,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Binary Sensor"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly (no sensor type)", async (t) => {
	const cc = new BinarySensorCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			BinarySensorCommand.Get, // CC Command
			BinarySensorType.Any, // sensor type
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Get command should serialize correctly", async (t) => {
	const cc = new BinarySensorCCGet({
		nodeId: 1,
		sensorType: BinarySensorType.CO,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([BinarySensorCommand.Get, BinarySensorType.CO]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command (v1) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BinarySensorCommand.Report, // CC Command
			0xff, // current value
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as BinarySensorCCReport;
	t.expect(cc.constructor).toBe(BinarySensorCCReport);

	t.expect(cc.value).toBe(true);
});

test("the Report command (v2) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BinarySensorCommand.Report, // CC Command
			0x00, // current value
			BinarySensorType.CO2,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as BinarySensorCCReport;
	t.expect(cc.constructor).toBe(BinarySensorCCReport);

	t.expect(cc.value).toBe(false);
	t.expect(cc.type).toBe(BinarySensorType.CO2);
});

test("the SupportedGet command should serialize correctly", async (t) => {
	const cc = new BinarySensorCCSupportedGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			BinarySensorCommand.SupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the SupportedReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BinarySensorCommand.SupportedReport, // CC Command
			0b10101010,
			0b10,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as BinarySensorCCSupportedReport;
	t.expect(cc.constructor).toBe(BinarySensorCCSupportedReport);

	t.expect(cc.supportedSensorTypes).toStrictEqual([
		BinarySensorType["General Purpose"],
		BinarySensorType.CO,
		BinarySensorType.Heat,
		BinarySensorType.Freeze,
		BinarySensorType.Aux,
	]);
});

test("deserializing an unsupported command should return an unspecified version of BinarySensorCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as BinarySensorCC;
	t.expect(cc.constructor).toBe(BinarySensorCC);
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
