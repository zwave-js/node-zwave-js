import {
	assertZWaveError,
	CommandClasses,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveNodeBase } from "@zwave-js/host";
import { createTestingHost } from "@zwave-js/host";
import * as nodeUtils from "../node/utils";
import { createTestNode, TestingHost } from "../test/mocks";
import {
	MeterCC,
	MeterCCGet,
	MeterCCReport,
	MeterCCReset,
	MeterCCSupportedGet,
	MeterCCSupportedReport,
} from "./MeterCC";
import { MeterCommand, RateType } from "./_Types";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Meter, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/MeterCC => ", () => {
	let host: TestingHost;
	let node2: ZWaveNodeBase;

	beforeAll(
		async () => {
			host = createTestingHost();
			node2 = createTestNode(host, { id: 2 });
			await host.configManager.loadMeters();
		},
		// Loading configuration may take a while on CI
		30000,
	);

	it("the Get command (V1) should serialize correctly", () => {
		const cc = new MeterCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				MeterCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Get command (V2) should serialize correctly", () => {
		const cc = new MeterCCGet(host, { nodeId: 1, scale: 0x03 });
		const expected = buildCCBuffer(
			Buffer.from([
				MeterCommand.Get, // CC Command
				0b11_000, // Scale
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Get command (V3) should serialize correctly", () => {
		const cc = new MeterCCGet(host, { nodeId: 1, scale: 0x06 });
		const expected = buildCCBuffer(
			Buffer.from([
				MeterCommand.Get, // CC Command
				0b110_000, // Scale
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Get command (V4) should serialize correctly", () => {
		const cc = new MeterCCGet(host, { nodeId: 1, scale: 0x0f });
		const expected = buildCCBuffer(
			Buffer.from([
				MeterCommand.Get, // CC Command
				0b111_000, // Scale 1
				0x1, // Scale 2
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedGet command should serialize correctly", () => {
		const cc = new MeterCCSupportedGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				MeterCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Reset command (V2) should serialize correctly", () => {
		const cc = new MeterCCReset(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				MeterCommand.Reset, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Reset command (V6) should serialize correctly", () => {
		const cc = new MeterCCReset(host, {
			nodeId: 1,
			type: 7,
			targetValue: 0x010203,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MeterCommand.Reset, // CC Command
				0b100_00111, // Size, Type
				0,
				1,
				2,
				3,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (V1) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				MeterCommand.Report, // CC Command
				0x03, // Meter type
				0b001_10_001, // precision, scale, size
				55, // value
			]),
		);
		const cc = new MeterCCReport(host, { nodeId: 1, data: ccData });

		expect(cc.type).toBe(3);
		expect(cc.scale.key).toBe(2);
		expect(cc.value).toBe(5.5);
		expect(cc.rateType).toBe(RateType.Unspecified);
		expect(cc.deltaTime).toBe(0);
		expect(cc.previousValue).toBeUndefined();
	});

	it("the Report command (V2) should be deserialized correctly (no time delta)", () => {
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

		expect(cc.type).toBe(3);
		expect(cc.scale.key).toBe(2);
		expect(cc.value).toBe(5.5);
		expect(cc.rateType).toBe(RateType.Produced);
		expect(cc.deltaTime).toBe(0);
		expect(cc.previousValue).toBeUndefined();
	});

	it("the Report command (V2) should be deserialized correctly (with time delta)", () => {
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

		expect(cc.type).toBe(3);
		expect(cc.scale.key).toBe(2);
		expect(cc.value).toBe(5.5);
		expect(cc.rateType).toBe(RateType.Produced);
		expect(cc.deltaTime).toBe(5);
		expect(cc.previousValue).toBe(5.4);
	});

	it("the Report command (V3) should be deserialized correctly", () => {
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

		expect(cc.scale.key).toBe(6);
	});

	it("the Report command (V4) should be deserialized correctly", () => {
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

		expect(cc.scale.key).toBe(8);
	});

	it("the Report command should validate that a known meter type is given", () => {
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

		// Meter type 31 (does not exist)
		assertZWaveError(
			() => new MeterCCReport(host, { nodeId: 1, data: ccData }),
			{
				errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
			},
		);
	});

	it("the Report command should validate that a known meter scale is given", () => {
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

		// Meter type 4, Scale 8 (does not exist)
		assertZWaveError(
			() => new MeterCCReport(host, { nodeId: 1, data: ccData }),
			{
				errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
			},
		);
	});

	it("the value IDs should be translated correctly", () => {
		expect(
			nodeUtils.translateValueID(host, node2, {
				commandClass: CommandClasses.Meter,
				property: "value",
				propertyKey: 329986,
			}),
		).toMatchObject({
			propertyKeyName: "Cooling_Unknown (0x09)_Produced",
		});
	});

	it("the SupportedReport command (V2/V3) should be deserialized correctly", () => {
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

		expect(cc.type).toBe(21);
		expect(cc.supportsReset).toBeTrue();
		expect(cc.supportedRateTypes).toEqual([]);
		expect(cc.supportedScales).toEqual([1, 2, 3, 5, 6]);
	});

	it("the SupportedReport command (V4/V5) should be deserialized correctly", () => {
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

		expect(cc.type).toBe(21);
		expect(cc.supportsReset).toBeTrue();
		expect(cc.supportedRateTypes).toEqual([RateType.Produced]);
		expect(cc.supportedScales).toEqual([0, 7, 15]);
	});

	// it("the SupportedReport command (V4/V5) should be deserialized correctly", () => {
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

	// 	expect(cc.type).toBe(21);
	// 	expect(cc.supportsReset).toBeTrue();
	// 	expect(cc.supportedRateTypes).toEqual([RateType.Produced]);
	// 	expect(cc.supportedScales).toEqual([0, 7, 15]);
	// });

	it("deserializing an unsupported command should return an unspecified version of MeterCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new MeterCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(MeterCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.Meter,
	// 		"currentValue",
	// 	);
	// 	expect(currentValueMeta).toMatchObject({
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
	// 	expect(targetValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: true,
	// 		min: 0,
	// 		max: 99,
	// 	});
	// });
});
