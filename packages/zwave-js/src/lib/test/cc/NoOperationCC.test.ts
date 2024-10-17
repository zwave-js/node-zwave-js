import { NoOperationCC } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import test from "ava";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["No Operation"], // CC
		]),
		payload,
	]);
}

test("the CC should serialize correctly", (t) => {
	const cc = new NoOperationCC({ nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([]), // No command!
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the CC should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([]), // No command!
	);
	t.notThrows(() =>
		new NoOperationCC({ nodeId: 2, data: ccData, context: {} as any })
	);
});
