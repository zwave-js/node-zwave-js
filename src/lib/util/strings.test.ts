import { assert, expect } from "chai";
import { padStart } from "./strings";
// tslint:disable:no-unused-expression

describe("lib/strings => padStart() => ", () => {

	it("should return a string padded to the given target length", () => {
		const targetLength = 6;
		const filler = " ";
		const result = padStart("1234", targetLength, filler);
		expect(result).to.have.length(targetLength);
		assert(result.startsWith(filler));
	});
	it("should default to a space as filler", () => {
		expect(padStart("1234", 6, " ")).to.equal(padStart("1234", 6));
	});
	it("should not alter string longer than the target length", () => {
		expect(padStart("12345678", 6, " ")).to.equal("12345678");
	});
	it("should throw on empty fillers", () => {
		expect(() => padStart("1234", 6, "")).to.throw();
		expect(() => padStart("1234", 6, null)).to.throw();
	});
	it("should truncate fillers whose length is not a multiple of the missing length", () => {
		expect(padStart("12345", 8, "ab")).to.equal("aba12345");
	});

});
