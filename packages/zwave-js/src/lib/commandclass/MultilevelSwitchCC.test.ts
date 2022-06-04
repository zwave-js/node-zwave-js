import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	MultilevelSwitchCC,
	MultilevelSwitchCCGet,
	MultilevelSwitchCCReport,
	MultilevelSwitchCCSet,
	MultilevelSwitchCCStartLevelChange,
	MultilevelSwitchCCStopLevelChange,
	MultilevelSwitchCCSupportedGet,
} from "./MultilevelSwitchCC";
import { MultilevelSwitchCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Multilevel Switch"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/MultilevelSwitchCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new MultilevelSwitchCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				MultilevelSwitchCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command (V1) should serialize correctly", () => {
		const cc = new MultilevelSwitchCCSet(host, {
			nodeId: 2,
			targetValue: 55,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultilevelSwitchCommand.Set, // CC Command
				55, // target value
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command (V2) should serialize correctly", () => {
		const cc = new MultilevelSwitchCCSet(host, {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (V1) should be deserialized correctly", () => {
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

		expect(cc.currentValue).toBe(55);
		expect(cc.targetValue).toBeUndefined();
		expect(cc.duration).toBeUndefined();
	});

	it("the Report command (v4) should be deserialized correctly", () => {
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

		expect(cc.currentValue).toBe(55);
		expect(cc.targetValue).toBe(66);
		expect(cc.duration!.unit).toBe("seconds");
		expect(cc.duration!.value).toBe(1);
	});

	it("the StartLevelChange command (V1) should serialize correctly (up, ignore start level)", () => {
		const cc = new MultilevelSwitchCCStartLevelChange(host, {
			nodeId: 2,
			direction: "up",
			ignoreStartLevel: true,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultilevelSwitchCommand.StartLevelChange, // CC Command
				0b001_00000, // up, ignore start level,
				0, // don't include a start level that should be ignored
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StartLevelChange command (V1) should serialize correctly (down)", () => {
		const cc = new MultilevelSwitchCCStartLevelChange(host, {
			nodeId: 2,
			direction: "down",
			ignoreStartLevel: false,
			startLevel: 50,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultilevelSwitchCommand.StartLevelChange, // CC Command
				0b010_00000, // down,
				50,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StopLevelChange command should serialize correctly", () => {
		const cc = new MultilevelSwitchCCStopLevelChange(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultilevelSwitchCommand.StopLevelChange, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StartLevelChange command (V2) should serialize correctly (down, with duration)", () => {
		const cc = new MultilevelSwitchCCStartLevelChange(host, {
			nodeId: 2,
			direction: "down",
			ignoreStartLevel: false,
			startLevel: 50,
			duration: new Duration(3, "seconds"),
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultilevelSwitchCommand.StartLevelChange, // CC Command
				0b010_00000, // down,
				50, // start level
				3, // 3 sec
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedGet command should serialize correctly", () => {
		const cc = new MultilevelSwitchCCSupportedGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultilevelSwitchCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("deserializing an unsupported command should return an unspecified version of MultilevelSwitchCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new MultilevelSwitchCC(host, {
			nodeId: 2,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(MultilevelSwitchCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.MultilevelSwitch,
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
	// 		CommandClasses.MultilevelSwitch,
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
