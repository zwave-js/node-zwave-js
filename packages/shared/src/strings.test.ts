import { cpp2js, isPrintableASCIIWithNewlines, num2hex } from "./strings";

describe("lib/strings => cpp2js() => ", () => {
	it("should truncate null-terminated strings", () => {
		const testCases = [
			["abc\0def", "abc"],
			["\0def", ""],
			["abcdef\0", "abcdef"],
		];
		for (const [inp, out] of testCases) {
			expect(cpp2js(inp)).toBe(out);
		}
	});

	it("should just return non-terminated strings", () => {
		const testCases = ["abc", "def", "abcdef"];
		for (const tc of testCases) {
			expect(cpp2js(tc)).toBe(tc);
		}
	});
});

describe("lib/strings => num2hex()", () => {
	it(`should return "undefined" when the input is null or undefined`, () => {
		expect(num2hex(null)).toBe("undefined");
		expect(num2hex(undefined)).toBe("undefined");
	});

	it("should return an even number lowercase hex digits prefixed with 0x", () => {
		const testCases: [number, string][] = [
			[1, "0x01"],
			[0xfed, "0x0fed"],
		];
		for (const [inp, out] of testCases) {
			expect(num2hex(inp)).toBe(out);
		}
	});

	it("when the uppercase parameter is true, the hex digits should be uppercase", () => {
		expect(num2hex(0xabc123, true)).toBe("0xABC123");
	});
});

describe("lib/strings => isPrintableASCIIWithNewlines() => ", () => {
	it("should return true for ASCII strings that start or end with newlines", () => {
		const testCases = [
			["abcdef\n\r", true],
			["\n\r", true],
			["", true],
			["\r\n \n\r", true],
			["ß", false],
			["\r\nß\r\n", false],
		] as const;
		for (const [inp, result] of testCases) {
			expect(isPrintableASCIIWithNewlines(inp)).toBe(result);
		}
	});
});
