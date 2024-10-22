import {
	CommandClass,
	SceneActuatorConfigurationCC,
	SceneActuatorConfigurationCCGet,
	SceneActuatorConfigurationCCReport,
	SceneActuatorConfigurationCCSet,
	SceneActuatorConfigurationCommand,
} from "@zwave-js/cc";
import { CommandClasses, Duration } from "@zwave-js/core";
import test from "ava";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
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
		Buffer.from([
			SceneActuatorConfigurationCommand.Get, // CC Command
			1,
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly with level", (t) => {
	const cc = new SceneActuatorConfigurationCCSet({
		nodeId: 2,
		sceneId: 2,
		level: 0x00,
		dimmingDuration: Duration.parseSet(0x05)!,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			SceneActuatorConfigurationCommand.Set, // CC Command
			2,
			0x05, // dimmingDuration
			0b1000_0000, // override
			0x00, // level
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly with undefined level", (t) => {
	const cc = new SceneActuatorConfigurationCCSet({
		nodeId: 2,
		sceneId: 2,
		// level: undefined,
		dimmingDuration: Duration.parseSet(0x05)!,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			SceneActuatorConfigurationCommand.Set, // CC Command
			2, // nodeId
			0x05, // dimmingDuration
			0b0000_0000, // override
			0xff, // level
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
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
	t.is(cc.constructor, SceneActuatorConfigurationCCReport);

	t.is(cc.sceneId, 55);
	t.is(cc.level, 0x50);
	t.deepEqual(cc.dimmingDuration, Duration.parseReport(0x05)!);
});

test("deserializing an unsupported command should return an unspecified version of SceneActuatorConfigurationCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc = CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 2 } as any,
	) as SceneActuatorConfigurationCC;
	t.is(cc.constructor, SceneActuatorConfigurationCC);
});
