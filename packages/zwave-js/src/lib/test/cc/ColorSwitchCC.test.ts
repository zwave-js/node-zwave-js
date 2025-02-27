import {
	CCAPI,
	ColorComponent,
	ColorSwitchCCGet,
	ColorSwitchCCReport,
	ColorSwitchCCSet,
	ColorSwitchCCStartLevelChange,
	ColorSwitchCCStopLevelChange,
	ColorSwitchCCSupportedGet,
	ColorSwitchCCSupportedReport,
	ColorSwitchCommand,
	CommandClass,
} from "@zwave-js/cc";
import {
	CommandClasses,
	Duration,
	type GetSupportedCCVersion,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Color Switch"], // CC
		]),
		payload,
	]);
}

test("the SupportedGet command should serialize correctly", async (t) => {
	const cc = new ColorSwitchCCSupportedGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.SupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the SupportedReport command should deserialize correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.SupportedReport, // CC Command
			0b0001_1111,
			0b0000_0001,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as ColorSwitchCCSupportedReport;
	t.expect(cc.constructor).toBe(ColorSwitchCCSupportedReport);

	t.expect(cc.supportedColorComponents).toStrictEqual([
		ColorComponent["Warm White"],
		ColorComponent["Cold White"],
		ColorComponent.Red,
		ColorComponent.Green,
		ColorComponent.Blue,
		ColorComponent.Index,
	]);
	// expect(cc.supportedColorComponents).not.toIncludeAnyMembers([
	// 	ColorComponent.Amber,
	// 	ColorComponent.Cyan,
	// 	ColorComponent.Purple,
	// ]);
});

test("the Get command should serialize correctly", async (t) => {
	const cc = new ColorSwitchCCGet({
		nodeId: 1,
		colorComponent: ColorComponent.Red,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.Get, // CC Command
			2, // Color Component
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should deserialize correctly (version 1)", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.Report, // CC Command
			0b0000_0010, // color: red
			0b1111_1111, // value: 255
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as ColorSwitchCCReport;
	t.expect(cc.constructor).toBe(ColorSwitchCCReport);

	t.expect(cc.colorComponent).toBe(ColorComponent.Red);
	t.expect(cc.currentValue).toBe(255);
	t.expect(cc.targetValue).toBeUndefined();
	t.expect(cc.duration).toBeUndefined();
});

test("the Report command should deserialize correctly (version 3)", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.Report, // CC Command
			0b0000_0010, // color: red
			0b1000_0000, // currentValue: 128
			0b1111_1111, // targetValue: 255,
			0b0000_0001, // duration: 1
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as ColorSwitchCCReport;
	t.expect(cc.constructor).toBe(ColorSwitchCCReport);

	t.expect(cc.colorComponent).toBe(ColorComponent.Red);
	t.expect(cc.currentValue).toBe(128);
	t.expect(cc.targetValue).toBe(255);
	t.expect(cc.duration!.value).toBe(1);
	t.expect(cc.duration!.unit).toBe("seconds");
});

test("the Set command should serialize correctly (without duration)", async (t) => {
	const cc = new ColorSwitchCCSet({
		nodeId: 1,
		red: 128,
		green: 255,
	});

	const expected = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.Set, // CC Command
			// WARN: This is sensitive to the order in which javascript serializes the colorTable keys.
			0b0000_0010, // reserved + count
			0b0000_0010, // color: red
			0b1000_0000, // value: 128
			0b0000_0011, // color: green
			0b1111_1111, // value: 255
			0xff, // duration: default
		]),
	);

	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 0; // Default to implemented version
		},
	} satisfies GetSupportedCCVersion as any;

	await t.expect(cc.serialize(ctx)).resolves.toStrictEqual(expected);
});

test("the Set command should serialize correctly (version 2)", async (t) => {
	const cc = new ColorSwitchCCSet({
		nodeId: 1,
		red: 128,
		green: 255,
		duration: new Duration(1, "seconds"),
	});

	const expected = buildCCBuffer(
		Uint8Array.from([
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
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 2;
		},
	} satisfies GetSupportedCCVersion as any;

	await t.expect(cc.serialize(ctx)).resolves.toStrictEqual(expected);
});

test("the StartLevelChange command should serialize correctly", async (t) => {
	const cc = new ColorSwitchCCStartLevelChange({
		nodeId: 1,
		startLevel: 5,
		ignoreStartLevel: true,
		direction: "up",
		colorComponent: ColorComponent.Red,
		duration: new Duration(1, "seconds"),
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.StartLevelChange,
			0b0010_0000, // up/down: 0, ignoreStartLevel: 1
			0b0000_0010, // color: red
			0b0000_0101, // startLevel: 5
			0b0000_0001, // duration: 1
		]),
	);
	const ctx = {
		getSupportedCCVersion(cc, nodeId, endpointIndex) {
			return 3;
		},
	} satisfies GetSupportedCCVersion as any;

	await t.expect(cc.serialize(ctx)).resolves.toStrictEqual(expected);
});

test("the StopLevelChange command should serialize correctly", async (t) => {
	const cc = new ColorSwitchCCStopLevelChange({
		nodeId: 1,
		colorComponent: ColorComponent.Red,
	});

	const expected = buildCCBuffer(
		Uint8Array.from([
			ColorSwitchCommand.StopLevelChange, // CC Command
			0b0000_0010, // color: red
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the setValue API verifies that targetColor isn't set with non-numeric keys", async (t) => {
	// Repro for https://github.com/zwave-js/zwave-js/issues/4811
	const API = CCAPI.create(
		CommandClasses["Color Switch"],
		undefined as any,
		undefined as any,
		false,
	);
	await assertZWaveError(
		t.expect,
		() =>
			API.setValue!(
				{ property: "targetColor" },
				{
					red: null,
				},
			),
		{
			errorCode: ZWaveErrorCodes.Argument_Invalid,
			messageMatches: `must be of type "number"`,
		},
	);
});
