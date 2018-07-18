import { assert, expect } from "chai";
import { cpp2js } from "./strings";
// tslint:disable:no-unused-expression

describe("lib/strings => cpp2js() => ", () => {
	it("should truncate null-terminated strings", () => {
		const testCases = [
			["abc\0def", "abc"],
			["\0def", ""],
			["abcdef\0", "abcdef"],
		];
		for (const [inp, out] of testCases) {
			expect(cpp2js(inp)).to.equal(out);
		}
	});

	it("should just return non-terminated strings", () => {
		const testCases = [
			"abc", "def", "abcdef",
		];
		for (const tc of testCases) {
			expect(cpp2js(tc)).to.equal(tc);
		}
	});
});
