import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	BinarySwitchCC,
	BinarySwitchCCGet,
	BinarySwitchCCReport,
	BinarySwitchCCSet,
} from "./BinarySwitchCC";
import { BinarySwitchCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Binary Switch"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/BinarySwitchCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new BinarySwitchCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				BinarySwitchCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command (v1) should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command (v2) should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
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

		expect(cc.currentValue).toBe(true);
		expect(cc.targetValue).toBeUndefined();
		expect(cc.duration).toBeUndefined();
	});

	it("the Report command (v2) should be deserialized correctly", () => {
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

		expect(cc.currentValue).toBe(true);
		expect(cc.targetValue).toBe(false);
		expect(cc.duration!.unit).toBe("seconds");
		expect(cc.duration!.value).toBe(1);
	});

	it("deserializing an unsupported command should return an unspecified version of BinarySwitchCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new BinarySwitchCC(host, {
			nodeId: 2,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(BinarySwitchCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.BinarySwitch,
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
	// 		CommandClasses.BinarySwitch,
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
