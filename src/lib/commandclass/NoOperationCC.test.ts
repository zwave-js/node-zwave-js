import { createEmptyMockDriver } from "../../../test/mocks";
import { IDriver } from "../driver/IDriver";
import { CommandClass, getCommandClass } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { NoOperationCC } from "./NoOperationCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/commandclass/NoOperationCC => ", () => {
	const cc = new NoOperationCC(fakeDriver, { nodeId: 2 });
	let serialized: Buffer;

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "No Operation"`, () => {
		expect(getCommandClass(cc)).toBe(CommandClasses["No Operation"]);
	});

	it("should serialize correctly", () => {
		cc.nodeId = 2;
		serialized = cc.serialize();
		expect(serialized).toEqual(Buffer.from("020100", "hex"));
	});

	it("should deserialize correctly", () => {
		const deserialized = CommandClass.from(fakeDriver, serialized);
		expect(deserialized).toBeInstanceOf(NoOperationCC);
		expect(deserialized.nodeId).toBe(cc.nodeId);
	});
});
