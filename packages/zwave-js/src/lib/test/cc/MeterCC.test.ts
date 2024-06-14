import {
	MeterCC,
	MeterCCGet,
	MeterCCReport,
	MeterCCReset,
	MeterCCSupportedGet,
	MeterCCSupportedReport,
	MeterCommand,
	RateType,
} from "@zwave-js/cc";
import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";
import * as nodeUtils from "../../node/utils";
import { createTestNode } from "../mocks";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Meter, // CC
		]),
		payload,
	]);
}

const host = createTestingHost();
const node2 = createTestNode(host, { id: 2 });

test("the Get command (V1) should serialize correctly", (t) => {
	const cc = new MeterCCGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			MeterCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Get command (V2) should serialize correctly", (t) => {
	const cc = new MeterCCGet(host, { nodeId: 1, scale: 0x03 });
	const expected = buildCCBuffer(
		Buffer.from([
			MeterCommand.Get, // CC Command
			0b11_000, // Scale
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Get command (V3) should serialize correctly", (t) => {
	const cc = new MeterCCGet(host, { nodeId: 1, scale: 0x06 });
	const expected = buildCCBuffer(
		Buffer.from([
			MeterCommand.Get, // CC Command
			0b110_000, // Scale
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Get command (V4) should serialize correctly", (t) => {
	const cc = new MeterCCGet(host, { nodeId: 1, scale: 0x0f });
	const expected = buildCCBuffer(
		Buffer.from([
			MeterCommand.Get, // CC Command
			0b111_000, // Scale 1
			0x1, // Scale 2
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new MeterCCSupportedGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			MeterCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Reset command (V2) should serialize correctly", (t) => {
	const cc = new MeterCCReset(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			MeterCommand.Reset, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Reset command (V6) should serialize correctly", (t) => {
	const cc = new MeterCCReset(host, {
		nodeId: 1,
		type: 7,
		scale: 3,
		rateType: RateType.Unspecified,
		targetValue: 12.3,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MeterCommand.Reset, // CC Command
			0b0_00_00111, // scale (2), rate type, type
			0b001_11_001, // precision, scale, size
			123, // 12.3
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command (V1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.Report, // CC Command
			0x03, // Meter type
			0b001_10_001, // precision, scale, size
			55, // value
		]),
	);
	const cc = new MeterCCReport(host, { nodeId: 1, data: ccData });

	t.is(cc.type, 3);
	t.is(cc.scale, 2);
	t.is(cc.value, 5.5);
	t.is(cc.rateType, RateType.Unspecified);
	t.is(cc.deltaTime, 0);
	t.is(cc.previousValue, undefined);
});

test("the Report command (V2) should be deserialized correctly (no time delta)", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.Report, // CC Command
			0b0_10_00011, // Rate type, Meter type
			0b001_10_001, // precision, scale, size
			55, // value
			0, // delta time
			0,
		]),
	);
	const cc = new MeterCCReport(host, { nodeId: 1, data: ccData });

	t.is(cc.type, 3);
	t.is(cc.scale, 2);
	t.is(cc.value, 5.5);
	t.is(cc.rateType, RateType.Produced);
	t.is(cc.deltaTime, 0);
	t.is(cc.previousValue, undefined);
});

test("the Report command (V2) should be deserialized correctly (with time delta)", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.Report, // CC Command
			0b0_10_00011, // Rate type, Meter type
			0b001_10_001, // precision, scale, size
			55, // value
			0, // delta time
			5,
			54, // previous value
		]),
	);
	const cc = new MeterCCReport(host, { nodeId: 1, data: ccData });

	t.is(cc.type, 3);
	t.is(cc.scale, 2);
	t.is(cc.value, 5.5);
	t.is(cc.rateType, RateType.Produced);
	t.is(cc.deltaTime, 5);
	t.is(cc.previousValue, 5.4);
});

test("the Report command (V3) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.Report, // CC Command
			0b1_10_00001, // Scale(2), Rate type, Meter type
			0b001_10_001, // precision, Scale (1:0), size
			55, // value
			0, // delta time
			5,
			54, // previous value
		]),
	);
	const cc = new MeterCCReport(host, { nodeId: 1, data: ccData });

	t.is(cc.scale, 6);
});

test("the Report command (V4) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.Report, // CC Command
			0b1_10_00001, // Scale(2), Rate type, Meter type
			0b001_11_001, // precision, Scale (1:0), size
			55, // value
			0, // delta time
			5,
			54, // previous value
			0b01, // Scale2
		]),
	);
	const cc = new MeterCCReport(host, { nodeId: 1, data: ccData });

	t.is(cc.scale, 8);
});

test("the Report command should validate that a known meter type is given", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.Report, // CC Command
			0b1_10_11111, // Scale(2), Rate type, Meter type
			0b001_11_001, // precision, Scale (1:0), size
			55, // value
			0, // delta time
			5,
			54, // previous value
			0b01, // Scale2
		]),
	);

	const report = new MeterCCReport(host, { nodeId: 1, data: ccData });

	// Meter type 31 (does not exist)
	assertZWaveError(t, () => report.persistValues(host), {
		errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
	});
});

test("the Report command should validate that a known meter scale is given", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.Report, // CC Command
			0b1_10_00100, // Scale(2), Rate type, Meter type
			0b001_11_001, // precision, Scale (1:0), size
			55, // value
			0, // delta time
			5,
			54, // previous value
			0b01, // Scale2
		]),
	);

	const report = new MeterCCReport(host, { nodeId: 1, data: ccData });

	// Meter type 4, Scale 8 (does not exist)
	assertZWaveError(t, () => report.persistValues(host), {
		errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
	});
});

test("the value IDs should be translated correctly", (t) => {
	t.like(
		nodeUtils.translateValueID(host, node2, {
			commandClass: CommandClasses.Meter,
			property: "value",
			propertyKey: 329986,
		}),
		{
			propertyKeyName: "Cooling_Unknown (0x09)_Produced",
		},
	);
});

test("the SupportedReport command (V2/V3) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.SupportedReport, // CC Command
			0b1_00_10101, // supports reset, type
			0b01101110, // supported scales
		]),
	);
	const cc = new MeterCCSupportedReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.type, 21);
	t.true(cc.supportsReset);
	t.deepEqual(cc.supportedRateTypes, []);
	t.deepEqual(cc.supportedScales, [1, 2, 3, 5, 6]);
});

test("the SupportedReport command (V4/V5) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MeterCommand.SupportedReport, // CC Command
			0b1_10_10101, // supports reset, rate types,type
			0b1_0000001, // more scale types, supported scales
			2, // scales to follow
			1,
			1,
		]),
	);
	const cc = new MeterCCSupportedReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.type, 21);
	t.true(cc.supportsReset);
	t.deepEqual(cc.supportedRateTypes, [RateType.Produced]);
	t.deepEqual(cc.supportedScales, [0, 7, 15]);
});

// test("the SupportedReport command (V4/V5) should be deserialized correctly", (t) => {
// 	const ccData = buildCCBuffer(
// 		Buffer.from([
// 			MeterCommand.SupportedReport, // CC Command
// 			0b1_10_10101, // supports reset, rate types,type
// 			0b1_0000001, // more scale types, supported scales
// 			2, // scales to follow
// 			1,
// 			1,
// 		]),
// 	);
// 	const cc = new MeterCCSupportedReport(host, {
// 		nodeId: 1,
// 		data: ccData,
// 	});

// 	t.is(cc.type, 21);
// 	t.true(cc.supportsReset);
// 	t.deepEqual(cc.supportedRateTypes, [RateType.Produced]);
// 	t.deepEqual(cc.supportedScales, [0, 7, 15]);
// });

test("deserializing an unsupported command should return an unspecified version of MeterCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new MeterCC(host, {
		nodeId: 1,
		data: serializedCC,
	});
	t.is(cc.constructor, MeterCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.Meter,
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
// 		CommandClasses.Meter,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
