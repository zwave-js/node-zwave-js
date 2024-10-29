import {
	CommandClass,
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
import { type GetSupportedCCVersion, createTestingHost } from "@zwave-js/host";
import { Bytes } from "@zwave-js/shared/safe";
import test from "ava";
import * as nodeUtils from "../../node/utils";
import { createTestNode } from "../mocks";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses.Meter, // CC
		]),
		payload,
	]);
}

const host = createTestingHost();
const node2 = createTestNode(host, { id: 2 });

test("the Get command (V1) should serialize correctly", (t) => {
	const cc = new MeterCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Get, // CC Command
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 1;
		},
	} satisfies GetSupportedCCVersion as any;

	t.deepEqual(cc.serialize(ctx), expected);
});

test("the Get command (V2) should serialize correctly", (t) => {
	const cc = new MeterCCGet({ nodeId: 1, scale: 0x03 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Get, // CC Command
			0b11_000, // Scale
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 2;
		},
	} satisfies GetSupportedCCVersion as any;

	t.deepEqual(cc.serialize(ctx), expected);
});

test("the Get command (V3) should serialize correctly", (t) => {
	const cc = new MeterCCGet({ nodeId: 1, scale: 0x06 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Get, // CC Command
			0b110_000, // Scale
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 3;
		},
	} satisfies GetSupportedCCVersion as any;

	t.deepEqual(cc.serialize(ctx), expected);
});

test("the Get command (V4) should serialize correctly", (t) => {
	const cc = new MeterCCGet({ nodeId: 1, scale: 0x0f });
	const expected = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Get, // CC Command
			0b111_000, // Scale 1
			0x1, // Scale 2
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 4;
		},
	} satisfies GetSupportedCCVersion as any;

	t.deepEqual(cc.serialize(ctx), expected);
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new MeterCCSupportedGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Reset command (V2) should serialize correctly", (t) => {
	const cc = new MeterCCReset({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Reset, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Reset command (V6) should serialize correctly", (t) => {
	const cc = new MeterCCReset({
		nodeId: 1,
		type: 7,
		scale: 3,
		rateType: RateType.Unspecified,
		targetValue: 12.3,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Reset, // CC Command
			0b0_00_00111, // scale (2), rate type, type
			0b001_11_001, // precision, scale, size
			123, // 12.3
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Report command (V1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Report, // CC Command
			0x03, // Meter type
			0b001_10_001, // precision, scale, size
			55, // value
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCReport;
	t.is(cc.constructor, MeterCCReport);

	t.is(cc.type, 3);
	t.is(cc.scale, 2);
	t.is(cc.value, 5.5);
	t.is(cc.rateType, RateType.Unspecified);
	t.is(cc.deltaTime, 0);
	t.is(cc.previousValue, undefined);
});

test("the Report command (V2) should be deserialized correctly (no time delta)", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Report, // CC Command
			0b0_10_00011, // Rate type, Meter type
			0b001_10_001, // precision, scale, size
			55, // value
			0, // delta time
			0,
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCReport;
	t.is(cc.constructor, MeterCCReport);

	t.is(cc.type, 3);
	t.is(cc.scale, 2);
	t.is(cc.value, 5.5);
	t.is(cc.rateType, RateType.Produced);
	t.is(cc.deltaTime, 0);
	t.is(cc.previousValue, undefined);
});

test("the Report command (V2) should be deserialized correctly (with time delta)", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Report, // CC Command
			0b0_10_00011, // Rate type, Meter type
			0b001_10_001, // precision, scale, size
			55, // value
			0, // delta time
			5,
			54, // previous value
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCReport;
	t.is(cc.constructor, MeterCCReport);

	t.is(cc.type, 3);
	t.is(cc.scale, 2);
	t.is(cc.value, 5.5);
	t.is(cc.rateType, RateType.Produced);
	t.is(cc.deltaTime, 5);
	t.is(cc.previousValue, 5.4);
});

test("the Report command (V3) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.Report, // CC Command
			0b1_10_00001, // Scale(2), Rate type, Meter type
			0b001_10_001, // precision, Scale (1:0), size
			55, // value
			0, // delta time
			5,
			54, // previous value
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCReport;
	t.is(cc.constructor, MeterCCReport);

	t.is(cc.scale, 6);
});

test("the Report command (V4) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
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
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCReport;
	t.is(cc.constructor, MeterCCReport);

	t.is(cc.scale, 8);
});

test("the Report command should validate that a known meter type is given", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
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

	const report = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCReport;
	t.is(report.constructor, MeterCCReport);

	// Meter type 31 (does not exist)
	assertZWaveError(t, () => report.persistValues(host), {
		errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
	});
});

test("the Report command should validate that a known meter scale is given", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
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

	const report = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCReport;
	t.is(report.constructor, MeterCCReport);

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
		Uint8Array.from([
			MeterCommand.SupportedReport, // CC Command
			0b1_00_10101, // supports reset, type
			0b01101110, // supported scales
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCSupportedReport;
	t.is(cc.constructor, MeterCCSupportedReport);

	t.is(cc.type, 21);
	t.true(cc.supportsReset);
	t.deepEqual(cc.supportedRateTypes, []);
	t.deepEqual(cc.supportedScales, [1, 2, 3, 5, 6]);
});

test("the SupportedReport command (V4/V5) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			MeterCommand.SupportedReport, // CC Command
			0b1_10_10101, // supports reset, rate types,type
			0b1_0000001, // more scale types, supported scales
			2, // scales to follow
			1,
			1,
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as MeterCCSupportedReport;
	t.is(cc.constructor, MeterCCSupportedReport);

	t.is(cc.type, 21);
	t.true(cc.supportsReset);
	t.deepEqual(cc.supportedRateTypes, [RateType.Produced]);
	t.deepEqual(cc.supportedScales, [0, 7, 15]);
});

// test("the SupportedReport command (V4/V5) should be deserialized correctly", (t) => {
// 	const ccData = buildCCBuffer(
// 		Uint8Array.from([
// 			MeterCommand.SupportedReport, // CC Command
// 			0b1_10_10101, // supports reset, rate types,type
// 			0b1_0000001, // more scale types, supported scales
// 			2, // scales to follow
// 			1,
// 			1,
// 		]),
// 	);
// 	const cc = new MeterCCSupportedReport({
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
		Uint8Array.from([255]), // not a valid command
	);
	const cc = CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as MeterCC;
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
