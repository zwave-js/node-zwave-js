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
} from "@zwave-js/cc";
import {
	assertZWaveErrorAva,
	CommandClasses,
	Duration,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Color Switch"], // CC
		]),
		payload,
	]);
}

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new ColorSwitchCCSupportedGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			ColorSwitchCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the SupportedReport command should deserialize correctly", (t) => {
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

	t.deepEqual(cc.supportedColorComponents, [
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

test("the Get command should serialize correctly", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command should deserialize correctly (version 1)", (t) => {
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

	t.is(cc.colorComponent, ColorComponent.Red);
	t.is(cc.currentValue, 255);
	t.is(cc.targetValue, undefined);
	t.is(cc.duration, undefined);
});

test("the Report command should deserialize correctly (version 3)", (t) => {
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

	t.is(cc.colorComponent, ColorComponent.Red);
	t.is(cc.currentValue, 128);
	t.is(cc.targetValue, 255);
	t.is(cc.duration!.value, 1);
	t.is(cc.duration!.unit, "seconds");
});

test("the Set command should serialize correctly (version 1)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command should serialize correctly (version 2)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the StartLevelChange command should serialize correctly (up) (version 1)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the StartLevelChange command should serialize correctly (down) (version 1)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the StartLevelChange command should serialize correctly (ignoreStartLevel) (version 1)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the StartLevelChange command should serialize correctly (duration) (version 3)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the StopLevelChange command should serialize correctly", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the setValue API verifies that targetColor isn't set with non-numeric keys", async (t) => {
	// Repro for https://github.com/zwave-js/node-zwave-js/issues/4811
	const API = CCAPI.create(
		CommandClasses["Color Switch"],
		undefined as any,
		undefined as any,
		false,
	);
	await assertZWaveErrorAva(
		t,
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
