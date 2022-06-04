import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	BinarySensorCC,
	BinarySensorCCGet,
	BinarySensorCCReport,
	BinarySensorCCSupportedGet,
	BinarySensorCCSupportedReport,
} from "./BinarySensorCC";
import { BinarySensorCommand, BinarySensorType } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Binary Sensor"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/BinarySensorCC => ", () => {
	it("the Get command (v1) should serialize correctly", () => {
		const cc = new BinarySensorCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				BinarySensorCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Get command (v2) should serialize correctly", () => {
		const cc = new BinarySensorCCGet(host, {
			nodeId: 1,
			sensorType: BinarySensorType.CO,
		});
		const expected = buildCCBuffer(
			Buffer.from([BinarySensorCommand.Get, BinarySensorType.CO]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				BinarySensorCommand.Report, // CC Command
				0xff, // current value
			]),
		);
		const cc = new BinarySensorCCReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.value).toBe(true);
	});

	it("the Report command (v2) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				BinarySensorCommand.Report, // CC Command
				0x00, // current value
				BinarySensorType.CO2,
			]),
		);
		const cc = new BinarySensorCCReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.value).toBe(false);
		expect(cc.type).toBe(BinarySensorType.CO2);
	});

	it("the SupportedGet command should serialize correctly", () => {
		const cc = new BinarySensorCCSupportedGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				BinarySensorCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				BinarySensorCommand.SupportedReport, // CC Command
				0b10101010,
				0b10,
			]),
		);
		const cc = new BinarySensorCCSupportedReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.supportedSensorTypes).toEqual([
			BinarySensorType["General Purpose"],
			BinarySensorType.CO,
			BinarySensorType.Heat,
			BinarySensorType.Freeze,
			BinarySensorType.Aux,
		]);
	});

	it("deserializing an unsupported command should return an unspecified version of BinarySensorCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new BinarySensorCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(BinarySensorCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses["Binary Sensor"],
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
	// 		CommandClasses["Binary Sensor"],
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
