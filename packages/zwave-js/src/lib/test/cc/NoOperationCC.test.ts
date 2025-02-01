import { NoOperationCC } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["No Operation"], // CC
		]),
		payload,
	]);
}

test("the CC should serialize correctly", async (t) => {
	const cc = new NoOperationCC({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([]), // No command!
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the CC should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([]), // No command!
	);
	t.expect(() =>
		new NoOperationCC({ nodeId: 2, data: ccData, context: {} as any })
	).not.toThrow();
});
