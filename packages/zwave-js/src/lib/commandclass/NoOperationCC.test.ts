import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { createEmptyMockDriver } from "../test/mocks";
import { NoOperationCC } from "./NoOperationCC";

const fakeDriver = createEmptyMockDriver() as unknown as Driver;

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
		const cc = new NoOperationCC(fakeDriver, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([]), // No command!
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CC should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([]), // No command!
		);
		void new NoOperationCC(fakeDriver, { nodeId: 2, data: ccData });
	});
});
