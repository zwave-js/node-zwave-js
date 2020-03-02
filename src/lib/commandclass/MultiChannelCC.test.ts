import { createEmptyMockDriver } from "../../../test/mocks";
import { IDriver } from "../driver/IDriver";
import { BasicCCSet } from "./BasicCC";
import { CommandClass } from "./CommandClass";
import { isEncapsulatingCommandClass } from "./EncapsulatingCommandClass";
import { MultiChannelCC } from "./MultiChannelCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/commandclass/MultiChannelCC", () => {
	describe("class MultiChannelCC", () => {
		it("is an encapsulating CommandClass", () => {
			let cc: CommandClass = new BasicCCSet(fakeDriver, {
				nodeId: 1,
				targetValue: 50,
			});
			cc = MultiChannelCC.encapsulate(fakeDriver, cc);
			expect(isEncapsulatingCommandClass(cc)).toBeTrue();
		});
	});
});
