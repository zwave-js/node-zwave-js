import {
	CommandClass,
	SceneControllerConfigurationCC,
	SceneControllerConfigurationCCGet,
	SceneControllerConfigurationCCReport,
	SceneControllerConfigurationCCSet,
	SceneControllerConfigurationCommand,
} from "@zwave-js/cc";
import { CommandClasses, Duration } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Scene Controller Configuration"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new SceneControllerConfigurationCCGet({
		nodeId: 2,
		groupId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneControllerConfigurationCommand.Get, // CC Command
			0b0000_0001,
		]),
	);
	t.expect(cc.serialize({} as any)).toStrictEqual(expected);
});

test("the Set command should serialize correctly", (t) => {
	const cc = new SceneControllerConfigurationCCSet({
		nodeId: 2,
		groupId: 3,
		sceneId: 240,
		dimmingDuration: Duration.parseSet(0x05)!,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneControllerConfigurationCommand.Set, // CC Command
			3, // groupId
			240, // sceneId
			0x05, // dimming duration
		]),
	);
	t.expect(cc.serialize({} as any)).toStrictEqual(expected);
});

test("the Set command should serialize correctly with undefined duration", (t) => {
	const cc = new SceneControllerConfigurationCCSet({
		nodeId: 2,
		groupId: 3,
		sceneId: 240,
		dimmingDuration: undefined,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneControllerConfigurationCommand.Set, // CC Command
			3, // groupId
			240, // sceneId
			0xff, // dimming duration
		]),
	);
	t.expect(cc.serialize({} as any)).toStrictEqual(expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			SceneControllerConfigurationCommand.Report, // CC Command
			3, // groupId
			240, // sceneId
			0x05, // dimming duration
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as SceneControllerConfigurationCCReport;
	t.expect(cc.constructor).toBe(SceneControllerConfigurationCCReport);

	t.expect(cc.groupId).toBe(3);
	t.expect(cc.sceneId).toBe(240);
	t.expect(cc.dimmingDuration).toStrictEqual(Duration.parseReport(0x05)!);
});

test("deserializing an unsupported command should return an unspecified version of SceneControllerConfigurationCC", (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as SceneControllerConfigurationCC;
	t.expect(cc.constructor).toBe(SceneControllerConfigurationCC);
});
