import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { NoOperationCC } from "./NoOperationCC";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["No Operation"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/NoOperationCC => ", () => {
	it("the CC should serialize correctly", () => {
		const cc = new NoOperationCC(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([]), // No command!
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CC should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([]), // No command!
		);
		void new NoOperationCC(host, { nodeId: 2, data: ccData });
	});
});
