import {
	CommandClass,
	SceneActuatorConfigurationCC,
	SceneActuatorConfigurationCCGet,
	SceneActuatorConfigurationCCReport,
	SceneActuatorConfigurationCCSet,
	SceneActuatorConfigurationCommand,
} from "@zwave-js/cc";
import { CommandClasses, Duration } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Scene Actuator Configuration"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new SceneActuatorConfigurationCCGet({
		nodeId: 2,
		sceneId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneActuatorConfigurationCommand.Get, // CC Command
			1,
		]),
	);
	t.expect(cc.serialize({} as any)).toStrictEqual(expected);
});

test("the Set command should serialize correctly with level", (t) => {
	const cc = new SceneActuatorConfigurationCCSet({
		nodeId: 2,
		sceneId: 2,
		level: 0x00,
		dimmingDuration: Duration.parseSet(0x05)!,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneActuatorConfigurationCommand.Set, // CC Command
			2,
			0x05, // dimmingDuration
			0b1000_0000, // override
			0x00, // level
		]),
	);
	t.expect(cc.serialize({} as any)).toStrictEqual(expected);
});

test("the Set command should serialize correctly with undefined level", (t) => {
	const cc = new SceneActuatorConfigurationCCSet({
		nodeId: 2,
		sceneId: 2,
		// level: undefined,
		dimmingDuration: Duration.parseSet(0x05)!,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneActuatorConfigurationCommand.Set, // CC Command
			2, // nodeId
			0x05, // dimmingDuration
			0b0000_0000, // override
			0xff, // level
		]),
	);
	t.expect(cc.serialize({} as any)).toStrictEqual(expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			SceneActuatorConfigurationCommand.Report, // CC Command
			55, // sceneId
			0x50, // level
			0x05, // dimmingDuration
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as SceneActuatorConfigurationCCReport;
	t.expect(cc.constructor).toBe(SceneActuatorConfigurationCCReport);

	t.expect(cc.sceneId).toBe(55);
	t.expect(cc.level).toBe(0x50);
	t.expect(cc.dimmingDuration).toStrictEqual(Duration.parseReport(0x05)!);
});

test("deserializing an unsupported command should return an unspecified version of SceneActuatorConfigurationCC", (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 2 } as any,
	) as SceneActuatorConfigurationCC;
	t.expect(cc.constructor).toBe(SceneActuatorConfigurationCC);
});
