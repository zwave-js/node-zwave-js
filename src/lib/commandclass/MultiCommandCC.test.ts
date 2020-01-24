import { createEmptyMockDriver } from "../../../test/mocks";
import type { IDriver } from "../driver/IDriver";
import { BasicCCSet } from "./BasicCC";
import type { CommandClass } from "./CommandClass";
import { isMultiEncapsulatingCommandClass } from "./EncapsulatingCommandClass";
import { MultiCommandCC } from "./MultiCommandCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

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
