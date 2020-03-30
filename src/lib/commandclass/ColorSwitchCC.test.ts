import { createEmptyMockDriver } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import {
	ColorComponent,
	ColorSwitchCCGet,
	ColorSwitchCCReport,
	ColorSwitchCCSet,
	ColorSwitchCCSupportedGet,
	ColorSwitchCCSupportedReport,
	ColorSwitchCommand,
} from "./ColorSwitchCC";
import { CommandClasses } from "./CommandClasses";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
const node1 = new ZWaveNode(1, fakeDriver as any);
(fakeDriver.controller!.nodes as any).set(1, node1);

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Color Switch"], // CC
		]),
		payload,
	]);
}

describe.only("lib/commandclass/ColorSwitchCC => ", () => {
	it("the SupportedGet command should serialize correctly", () => {
		const cc = new ColorSwitchCCSupportedGet(fakeDriver, {
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
		const cc = new ColorSwitchCCSupportedReport(fakeDriver, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.supportsColdWhite).toBe(true);
		expect(cc.supportsWarmWhite).toBe(true);
		expect(cc.supportsRed).toBe(true);
		expect(cc.supportsGreen).toBe(true);
		expect(cc.supportsBlue).toBe(true);
		expect(cc.supportsAmber).toBe(false);
		expect(cc.supportsCyan).toBe(false);
		expect(cc.supportsPurple).toBe(false);
		expect(cc.supportsIndex).toBe(true);
	});

	it("the Get command should serialize correctly", () => {
		const cc = new ColorSwitchCCGet(fakeDriver, {
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

	it("the Report command should deserialize correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				ColorSwitchCommand.Report, // CC Command
				0b0000_0010,
				0b1111_1111,
			]),
		);
		const cc = new ColorSwitchCCReport(fakeDriver, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.colorComponent).toBe(ColorComponent.Red);
		expect(cc.value).toBe(255);
	});

	it("the Set command should serialize correctly (version 1)", () => {
		const cc = new ColorSwitchCCSet(fakeDriver, {
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
		const cc = new ColorSwitchCCSet(fakeDriver, {
			nodeId: 1,
			red: 128,
			green: 255,
			duration: 4,
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
				0b0000_0100, // duration: 4
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});
});
