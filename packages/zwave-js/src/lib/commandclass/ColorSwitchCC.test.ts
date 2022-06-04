import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	ColorSwitchCCGet,
	ColorSwitchCCReport,
	ColorSwitchCCSet,
	ColorSwitchCCStartLevelChange,
	ColorSwitchCCStopLevelChange,
	ColorSwitchCCSupportedGet,
	ColorSwitchCCSupportedReport,
} from "./ColorSwitchCC";
import { ColorComponent, ColorSwitchCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Color Switch"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/ColorSwitchCC => ", () => {
	it("the SupportedGet command should serialize correctly", () => {
		const cc = new ColorSwitchCCSupportedGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedReport command should deserialize correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.SupportedReport, // CC Command
				0b0001_1111,
				0b0000_0001,
			]),
		);
		const cc = new ColorSwitchCCSupportedReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.supportedColorComponents).toIncludeAllMembers([
			ColorComponent["Cold White"],
			ColorComponent["Warm White"],
			ColorComponent.Red,
			ColorComponent.Green,
			ColorComponent.Blue,
			ColorComponent.Index,
		]);
		expect(cc.supportedColorComponents).not.toIncludeAnyMembers([
			ColorComponent.Amber,
			ColorComponent.Cyan,
			ColorComponent.Purple,
		]);
	});

	it("the Get command should serialize correctly", () => {
		const cc = new ColorSwitchCCGet(host, {
			nodeId: 1,
			colorComponent: ColorComponent.Red,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.Get, // CC Command
				2, // Color Component
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should deserialize correctly (version 1)", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.Report, // CC Command
				0b0000_0010, // color: red
				0b1111_1111, // value: 255
			]),
		);
		const cc = new ColorSwitchCCReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.colorComponent).toBe(ColorComponent.Red);
		expect(cc.currentValue).toBe(255);
		expect(cc.targetValue).toBeUndefined();
		expect(cc.duration).toBeUndefined();
	});

	it("the Report command should deserialize correctly (version 3)", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.Report, // CC Command
				0b0000_0010, // color: red
				0b1000_0000, // currentValue: 128
				0b1111_1111, // targetValue: 255,
				0b0000_0001, // duration: 1
			]),
		);
		const cc = new ColorSwitchCCReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.colorComponent).toBe(ColorComponent.Red);
		expect(cc.currentValue).toBe(128);
		expect(cc.targetValue).toBe(255);
		expect(cc.duration!.value).toBe(1);
		expect(cc.duration!.unit).toBe("seconds");
	});

	it("the Set command should serialize correctly (version 1)", () => {
		const cc = new ColorSwitchCCSet(host, {
			nodeId: 1,
			red: 128,
			green: 255,
		});
		cc.version = 1;

		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.Set, // CC Command
				// WARN: This is sensitive to the order in which javascript serializes the colorTable keys.
				0b0000_0010, // reserved + count
				0b0000_0010, // color: red
				0b1000_0000, // value: 128
				0b0000_0011, // color: green
				0b1111_1111, // value: 255
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (version 2)", () => {
		const cc = new ColorSwitchCCSet(host, {
			nodeId: 1,
			red: 128,
			green: 255,
			duration: new Duration(1, "seconds"),
		});
		cc.version = 2;

		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.Set, // CC Command
				// WARN: This is sensitive to the order in which javascript serializes the colorTable keys.
				0b0000_0010, // reserved + count
				0b0000_0010, // color: red
				0b1000_0000, // value: 128
				0b0000_0011, // color: green
				0b1111_1111, // value: 255
				0b0000_0001, // duration: 1
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StartLevelChange command should serialize correctly (up) (version 1)", () => {
		const cc = new ColorSwitchCCStartLevelChange(host, {
			nodeId: 1,
			ignoreStartLevel: false,
			startLevel: 5,
			direction: "up",
			colorComponent: ColorComponent.Red,
		});
		cc.version = 1;

		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.StartLevelChange,
				0b0000_0000, // up/down: 0, ignoreStartLevel: 0
				0b0000_0010, // color: red
				0b0000_0101, // startLevel: 5
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StartLevelChange command should serialize correctly (down) (version 1)", () => {
		const cc = new ColorSwitchCCStartLevelChange(host, {
			nodeId: 1,
			startLevel: 5,
			ignoreStartLevel: false,
			direction: "down",
			colorComponent: ColorComponent.Red,
		});
		cc.version = 1;

		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.StartLevelChange,
				0b0100_0000, // up/down: 0, ignoreStartLevel: 0
				0b0000_0010, // color: red
				0b0000_0101, // startLevel: 5
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StartLevelChange command should serialize correctly (ignoreStartLevel) (version 1)", () => {
		const cc = new ColorSwitchCCStartLevelChange(host, {
			nodeId: 1,
			colorComponent: ColorComponent.Red,
			ignoreStartLevel: true,
			direction: "up",
		});
		cc.version = 1;

		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.StartLevelChange,
				0b0010_0000, // up/down: 0, ignoreStartLevel: 1
				0b0000_0010, // color: red
				0b0000_0000, // startLevel: 0
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StartLevelChange command should serialize correctly (duration) (version 3)", () => {
		const cc = new ColorSwitchCCStartLevelChange(host, {
			nodeId: 1,
			startLevel: 5,
			ignoreStartLevel: false,
			direction: "up",
			colorComponent: ColorComponent.Red,
			duration: new Duration(1, "seconds"),
		});
		cc.version = 3;

		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.StartLevelChange,
				0b0000_0000, // up/down: 0, ignoreStartLevel: 0
				0b0000_0010, // color: red
				0b0000_0101, // startLevel: 5
				0b0000_0001, // duration: 1
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the StopLevelChange command should serialize correctly", () => {
		const cc = new ColorSwitchCCStopLevelChange(host, {
			nodeId: 1,
			colorComponent: ColorComponent.Red,
		});

		const expected = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.StopLevelChange, // CC Command
				0b0000_0010, // color: red
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});
});
