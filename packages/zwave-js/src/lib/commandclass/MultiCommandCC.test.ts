import { createEmptyMockDriver } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { BasicCCSet } from "./BasicCC";
import type { CommandClass } from "./CommandClass";
import { isMultiEncapsulatingCommandClass } from "./EncapsulatingCommandClass";
import { MultiCommandCC } from "./MultiCommandCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

describe("lib/commandclass/MultiCommandCC", () => {
	describe("MultiCommandCC()", () => {
		it("is a multi-encapsulating CommandClass", () => {
			let cc: CommandClass = new BasicCCSet(fakeDriver, {
				nodeId: 1,
				targetValue: 50,
			});
			cc = MultiCommandCC.encapsulate(fakeDriver, [cc]);
			expect(isMultiEncapsulatingCommandClass(cc)).toBeTrue();
		});
	});
});
