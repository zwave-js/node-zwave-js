import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { SceneActivationCC, SceneActivationCCSet } from "./SceneActivationCC";
import { SceneActivationCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Scene Activation"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/SceneActivationCC => ", () => {
	it("the Set command (without Duration) should serialize correctly", () => {
		const cc = new SceneActivationCCSet(host, {
			nodeId: 2,
			sceneId: 55,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneActivationCommand.Set, // CC Command
				55, // id
				0xff, // default duration
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command (with Duration) should serialize correctly", () => {
		const cc = new SceneActivationCCSet(host, {
			nodeId: 2,
			sceneId: 56,
			dimmingDuration: new Duration(1, "minutes"),
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneActivationCommand.Set, // CC Command
				56, // id
				0x80, // 1 minute
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				SceneActivationCommand.Set, // CC Command
				15, // id
				0x00, // 0 seconds
			]),
		);
		const cc = new SceneActivationCCSet(host, {
			nodeId: 2,
			data: ccData,
		});

		expect(cc.sceneId).toBe(15);
		expect(cc.dimmingDuration).toEqual(new Duration(0, "seconds"));
	});

	it("deserializing an unsupported command should return an unspecified version of SceneActivationCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new SceneActivationCC(host, {
			nodeId: 2,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(SceneActivationCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses["Scene Activation"],
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
	// 		CommandClasses["Scene Activation"],
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
