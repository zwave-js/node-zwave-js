import { IDriver } from "../driver/IDriver";
import { BasicCC } from "./BasicCC";
import {
	CommandClass,
	getImplementedVersion,
	getImplementedVersionStatic,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

@implementedVersion(7)
class DummyCC extends CommandClass {
	public constructor(driver: IDriver) {
		super(driver);
	}
}
class DummyCCSubClass extends DummyCC {
	public constructor(driver: IDriver) {
		super(driver);
	}
}

describe("lib/commandclass/CommandClass => ", () => {
	describe.skip("getImplementedVersion()", () => {
		it("should return the implemented version for a CommandClass instance", () => {
			const cc = new BasicCC(undefined as any);
			expect(getImplementedVersion(cc)).toBe(2);
		});

		it("should return the implemented version for a numeric CommandClass key", () => {
			const cc = CommandClasses.Basic;
			expect(getImplementedVersion(cc)).toBe(2);
		});

		it.skip("should return 0 for a non-implemented CommandClass instance", () => {
			// const cc = new CommandClass(undefined);
			// expect(getImplementedVersion(cc)).toBe(0);
		});

		it("should return the implemented version for a numeric CommandClass key", () => {
			const cc = -1;
			expect(getImplementedVersion(cc)).toBe(0);
		});

		it("should work with inheritance", () => {});
	});

	describe("getImplementedVersionStatic()", () => {
		it.skip("should return the implemented version for a CommandClass constructor", () => {
			expect(getImplementedVersionStatic(BasicCC)).toBe(2);
		});

		it("should work on inherited classes", () => {
			expect(getImplementedVersionStatic(DummyCCSubClass)).toBe(7);
		});
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
