import { BasicCC } from "./BasicCC";
import { CommandClass, CommandClasses, getImplementedVersion } from "./CommandClass";

describe("lib/commandclass/CommandClass => ", () => {
	it("getImplementedVersion should return the implemented version for a CommandClass instance", () => {
		const cc = new BasicCC(undefined);
		expect(getImplementedVersion(cc)).toBe(2);
	});

	it("getImplementedVersion should return the implemented version for a numeric CommandClass key", () => {
		const cc = CommandClasses.Basic;
		expect(getImplementedVersion(cc)).toBe(2);
	});

	it.skip("getImplementedVersion should return 0 for a non-implemented CommandClass instance", () => {
		// const cc = new CommandClass(undefined);
		// expect(getImplementedVersion(cc)).toBe(0);
	});

	it("getImplementedVersion should return the implemented version for a numeric CommandClass key", () => {
		const cc = -1;
		expect(getImplementedVersion(cc)).toBe(0);
	});

	it.skip("serializing with an undefined or null payload should behave like an empty payload", () => {
		// const cc1 = new CommandClass(undefined, 1, 1, Buffer.from([]));
		// const cc2 = new CommandClass(undefined, 1, 1, undefined);
		// const cc3 = new CommandClass(undefined, 1, 1, null);

		// const serialized1 = cc1.serialize();
		// const serialized2 = cc2.serialize();
		// const serialized3 = cc3.serialize();

		// expect(serialized1).toEqual(serialized2);
		// expect(serialized2).toEqual(serialized3);
	});

});
