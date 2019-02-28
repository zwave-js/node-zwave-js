// tslint:disable:no-unused-expression

import { expect, should } from "chai";
import { stub } from "sinon";
should();

import { BasicCC } from "./BasicCC";
import { CommandClass, CommandClasses, getImplementedVersion } from "./CommandClass";

describe("lib/commandclass/CommandClass => ", () => {
	it("getImplementedVersion should return the implemented version for a CommandClass instance", () => {
		const cc = new BasicCC(undefined);
		getImplementedVersion(cc).should.equal(2);
	});

	it("getImplementedVersion should return the implemented version for a numeric CommandClass key", () => {
		const cc = CommandClasses.Basic;
		getImplementedVersion(cc).should.equal(2);
	});

	it("getImplementedVersion should return 0 for a non-implemented CommandClass instance", () => {
		const cc = new CommandClass(undefined);
		getImplementedVersion(cc).should.equal(0);
	});

	it("getImplementedVersion should return the implemented version for a numeric CommandClass key", () => {
		const cc = -1;
		getImplementedVersion(cc).should.equal(0);
	});

	it("serializing with an undefined or null payload should behave like an empty payload", () => {
		const cc1 = new CommandClass(undefined, 1, 1, Buffer.from([]));
		const cc2 = new CommandClass(undefined, 1, 1, undefined);
		const cc3 = new CommandClass(undefined, 1, 1, null);

		const serialized1 = cc1.serialize();
		const serialized2 = cc2.serialize();
		const serialized3 = cc3.serialize();

		serialized1.should.deep.equal(serialized2);
		serialized2.should.deep.equal(serialized3);
	});

});
