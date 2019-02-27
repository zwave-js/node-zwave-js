// tslint:disable:no-unused-expression

import { expect } from "chai";

import { CommandClass, CommandClasses, getCommandClass } from "./CommandClass";
import { NoOperationCC } from "./NoOperationCC";

describe("lib/commandclass/NoOperationCC => ", () => {
	const cc = new NoOperationCC(undefined, 2);
	let serialized: Buffer;

	it("should be a CommandClass", () => {
		cc.should.be.an.instanceof(CommandClass);
	});
	it(`with command class "No Operation"`, () => {
		getCommandClass(cc).should.equal(CommandClasses["No Operation"]);
	});

	it("should serialize correctly", () => {
		cc.nodeId = 2;
		serialized = cc.serialize();
		serialized.should.deep.equal(Buffer.from("020100", "hex"));
	});

	it("should deserialize correctly", () => {
		const deserialized = CommandClass.from(undefined, serialized);
		deserialized.should.be.an.instanceof(NoOperationCC);
		deserialized.nodeId.should.equal(cc.nodeId);
	});

});
