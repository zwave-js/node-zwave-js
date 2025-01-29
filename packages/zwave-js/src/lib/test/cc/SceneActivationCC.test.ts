import {
	CommandClass,
	SceneActivationCC,
	SceneActivationCCSet,
	SceneActivationCommand,
} from "@zwave-js/cc";
import { CommandClasses, Duration } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Scene Activation"], // CC
		]),
		payload,
	]);
}

test("the Set command (without Duration) should serialize correctly", async (t) => {
	const cc = new SceneActivationCCSet({
		nodeId: 2,
		sceneId: 55,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneActivationCommand.Set, // CC Command
			55, // id
			0xff, // default duration
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command (with Duration) should serialize correctly", async (t) => {
	const cc = new SceneActivationCCSet({
		nodeId: 2,
		sceneId: 56,
		dimmingDuration: new Duration(1, "minutes"),
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			SceneActivationCommand.Set, // CC Command
			56, // id
			0x80, // 1 minute
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			SceneActivationCommand.Set, // CC Command
			15, // id
			0x00, // 0 seconds
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as SceneActivationCCSet;
	t.expect(cc.constructor).toBe(SceneActivationCCSet);

	t.expect(cc.sceneId).toBe(15);
	t.expect(cc.dimmingDuration).toStrictEqual(new Duration(0, "seconds"));
});

test("deserializing an unsupported command should return an unspecified version of SceneActivationCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 2 } as any,
	) as SceneActivationCC;
	t.expect(cc.constructor).toBe(SceneActivationCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses["Scene Activation"],
// 		"currentValue",
// 	);
// 	t.like(currentValueMeta, {
// 		readable: true,
// 		writeable: false,
// 		min: 0,
// 		max: 99,
// 	});

// 	// Writeable, 0-99
// 	const targetValueMeta = getCCValueMetadata(
// 		CommandClasses["Scene Activation"],
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
