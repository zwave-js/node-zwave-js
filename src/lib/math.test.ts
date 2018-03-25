import { expect } from "chai";
import { clamp, roundTo } from "./math";
// tslint:disable:no-unused-expression

describe("lib/math => clamp() =>", () => {
	const min = 5;
	const max = 20;
	const value = (min + max) / 2;

	it("below min should set to min", () => {
		expect(clamp(min - 1, min, max)).to.equal(min);
	});
	it("above max should set to max", () => {
		expect(clamp(max + 1, min, max)).to.equal(max);
	});
	it("in range should be unchanged", () => {
		expect(clamp(value, min, max)).to.equal(value);
	});
	it("should auto-fix reversed limits", () => {
		expect(clamp(min - 1, max, min)).to.equal(min);
		expect(clamp(max + 1, max, min)).to.equal(max);
		expect(clamp(value, max, min)).to.equal(value);
	});

});

describe("lib/math => roundTo() =>", () => {
	it("basic functionality should work", () => {
		expect(roundTo(10.0124, 3)).to.equal(10.012);
		expect(roundTo(10.0124, 2)).to.equal(10.01);
		expect(roundTo(10.0124, 0)).to.equal(10);
		expect(roundTo(12.0124, -1)).to.equal(10);
	});
});
