import { CommandClasses, ZWaveErrorCodes } from "@zwave-js/core";
import { createEmptyMockDriver } from "../../../test/mocks";
import { assertZWaveError } from "../../../test/util";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { BasicCC, BasicCCSet } from "./BasicCC";
import {
	CommandClass,
	commandClass,
	expectedCCResponse,
	getExpectedCCResponse,
	getImplementedVersion,
	getImplementedVersionStatic,
	implementedVersion,
} from "./CommandClass";
import "./index";

@implementedVersion(7)
@commandClass(0xffff as any)
class DummyCC extends CommandClass {}
class DummyCCSubClass1 extends DummyCC {
	private x: any;
}
@expectedCCResponse(DummyCCSubClass1)
class DummyCCSubClass2 extends DummyCC {
	private y: any;
}

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

describe("lib/commandclass/CommandClass => ", () => {
	describe("from()", () => {
		it("throws CC_NotImplemented when receiving a non-implemented CC", () => {
			// This is a Node Provisioning CC. Change it when that CC is implemented
			assertZWaveError(
				() =>
					CommandClass.from(fakeDriver, {
						data: Buffer.from("78030100", "hex"),
						nodeId: 5,
					}),
				{
					errorCode: ZWaveErrorCodes.CC_NotImplemented,
				},
			);
		});

		it("does not throw when the CC is implemented", () => {
			expect(() =>
				CommandClass.from(fakeDriver, {
					// CRC-16 with BasicCC
					data: Buffer.from("560120024d26", "hex"),
					nodeId: 5,
				}),
			).not.toThrow();
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
			expect(getImplementedVersionStatic(DummyCCSubClass1)).toBe(7);
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

	describe("getExpectedCCResponse()", () => {
		it("returns the expected CC response like it was defined", () => {
			const cc = new DummyCCSubClass2(fakeDriver, { nodeId: 1 });
			const actual = getExpectedCCResponse(cc);
			expect(actual).toBe(DummyCCSubClass1);
		});
	});

	describe("persistValues()", () => {
		let node2: ZWaveNode;

		beforeAll(() => {
			node2 = new ZWaveNode(2, fakeDriver as any);
			(fakeDriver.controller.nodes as any).set(2, node2);
		});

		it(`should not update "interviewComplete" in the value DB`, () => {
			// Repro for #383
			const cc = new BasicCCSet(fakeDriver, {
				nodeId: 2,
				targetValue: 55,
			});
			cc.interviewComplete = true;

			const mockSetValue = jest.fn();
			node2.valueDB.setValue = mockSetValue;
			cc.persistValues();

			const properties = mockSetValue.mock.calls
				.map(([arg0]) => arg0)
				.map(({ property }) => property);
			expect(properties).not.toContainValue("interviewComplete");
		});

		afterAll(() => {
			(fakeDriver.controller.nodes as any).delete(2);
		});
	});
});
