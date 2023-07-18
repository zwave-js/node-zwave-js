import { NoOperationCC } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["No Operation"], // CC
		]),
		payload,
	]);
}

test("the CC should serialize correctly", (t) => {
	const cc = new NoOperationCC(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([]), // No command!
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the CC should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([]), // No command!
	);
	t.notThrows(() => new NoOperationCC(host, { nodeId: 2, data: ccData }));
});
