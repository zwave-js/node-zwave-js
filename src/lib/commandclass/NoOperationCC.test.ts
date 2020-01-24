import { createEmptyMockDriver } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { CommandClasses } from "./CommandClasses";
import { NoOperationCC } from "./NoOperationCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

function buildCCBuffer(nodeId: number, payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			nodeId, // node number
			payload.length + 1, // remaining length
			CommandClasses["No Operation"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/NoOperationCC => ", () => {
	it("the CC should serialize correctly", () => {
		const cc = new NoOperationCC(fakeDriver, { nodeId: 1 });
		const expected = buildCCBuffer(
			1,
			Buffer.from([]), // No command!
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CC should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([]), // No command!
		);
		void new NoOperationCC(fakeDriver, { data: ccData });
	});
});
