// tslint:disable:no-unused-expression

import { CommandClass, CommandClasses, getCommandClass } from "./CommandClass";
import { NoOperationCC } from "./NoOperationCC";

describe("lib/commandclass/NoOperationCC => ", () => {
	const cc = new NoOperationCC(undefined, 2);
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
		const deserialized = CommandClass.from(undefined, serialized);
		expect(deserialized).toBeInstanceOf(NoOperationCC);
		expect(deserialized.nodeId).toBe(cc.nodeId);
	});

});
