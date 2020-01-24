import { createEmptyMockDriver } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { BasicCCSet } from "./BasicCC";
import { CommandClass, getExpectedCCResponse } from "./CommandClass";
import { isEncapsulatingCommandClass } from "./EncapsulatingCommandClass";
import { MultiChannelCC, MultiChannelCCCommandEncapsulation } from "./MultiChannelCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

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

	describe("class MultiChannelCCCommandEncapsulation", () => {
		it("expects itself in return if it was addressed to a single endpoint", () => {
			let cc: CommandClass = new BasicCCSet(fakeDriver, {
				nodeId: 1,
				targetValue: 50,
			});
			cc = new MultiChannelCCCommandEncapsulation(fakeDriver, {
				nodeId: 1,
				encapsulated: cc,
				destination: 5,
			});
			let actual: any = getExpectedCCResponse(cc);
			if (typeof actual === "function") actual = actual(cc);
			expect(actual).toBe(MultiChannelCCCommandEncapsulation);
		});

		it("expects no response if it was addressed to multiple endpoints", () => {
			let cc: CommandClass = new BasicCCSet(fakeDriver, {
				nodeId: 1,
				targetValue: 50,
			});
			cc = new MultiChannelCCCommandEncapsulation(fakeDriver, {
				nodeId: 1,
				encapsulated: cc,
				destination: [1, 2, 3, 4],
			});
			let actual: any = getExpectedCCResponse(cc);
			if (typeof actual === "function") actual = actual(cc);
			expect(actual).toBeUndefined();
		});
	});
});
