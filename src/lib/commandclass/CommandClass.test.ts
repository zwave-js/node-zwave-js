import { createEmptyMockDriver } from "../../../test/mocks";
import { assertZWaveError } from "../../../test/util";
import { IDriver } from "../driver/IDriver";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { BasicCC, BasicCCSet, BasicCommand } from "./BasicCC";
import {
	CommandClass,
	commandClass,
	getImplementedVersion,
	getImplementedVersionStatic,
	implementedVersion,
} from "./CommandClass";
import { CommandClasses } from "./CommandClasses";

@implementedVersion(7)
@commandClass(0xffff as any)
class DummyCC extends CommandClass {}
class DummyCCSubClass extends DummyCC {}

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/commandclass/CommandClass => ", () => {
	describe("from()", () => {
		it("throws CC_NotImplemented when receiving a non-implemented CC", () => {
			// TODO: This is a meter CC. Change it when that CC is implemented
			assertZWaveError(
				() =>
					CommandClass.from(
						fakeDriver,
						Buffer.from("0b0a32022144000000a30000", "hex"),
					),
				{
					errorCode: ZWaveErrorCodes.CC_NotImplemented,
				},
			);
		});
	});

	describe("fromEncapsulated()", () => {
		it("throws CC_NotImplemented when receiving a non-implemented CC", () => {
			// TODO: This is a meter CC. Change it when that CC is implemented
			assertZWaveError(
				() =>
					CommandClass.fromEncapsulated(
						fakeDriver,
						undefined as any,
						Buffer.from("0b0a32022144000000a30000", "hex"),
					),
				{
					errorCode: ZWaveErrorCodes.CC_NotImplemented,
				},
			);
		});
	});

	describe("serializeForEncapsulation()", () => {
		it("works correctly", () => {
			// Test with a BasicCC Set
			const cc = new BasicCCSet(fakeDriver, {
				nodeId: 2,
				targetValue: 55,
			});
			const serialized = cc.serializeForEncapsulation();
			const expected = Buffer.from([
				CommandClasses.Basic,
				BasicCommand.Set,
				cc.targetValue,
			]);
			expect(serialized).toEqual(expected);
		});
	});

	describe("getImplementedVersion()", () => {
		it("should return the implemented version for a CommandClass instance", () => {
			const cc = new BasicCC(fakeDriver, { nodeId: 1 });
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
		it("should return the implemented version for a CommandClass constructor", () => {
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

	describe("expectMoreMessages()", () => {
		it("returns false by default", () => {
			const cc = new DummyCC(fakeDriver, { nodeId: 1 });
			expect(cc.expectMoreMessages()).toBeFalse();
		});
	});

	describe("getNode()", () => {
		it("throws if the controller is undefined", () => {
			const driver = (createEmptyMockDriver() as unknown) as IDriver;
			delete (driver as any).controller;
			const cc = new DummyCC(driver, { nodeId: 1 });
			assertZWaveError(() => cc.getNode(), {
				messageMatches: "controller",
				errorCode: ZWaveErrorCodes.Driver_NotReady,
			});
		});
	});
});
