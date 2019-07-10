import { serializeCacheValue } from "./Cache";

describe("lib/values/Cache", () => {
	describe("serializeCacheValue()", () => {
		it("leaves numbers untouched", () => {
			const tests = [1, 2, 6, 7, -1, 0.15];
			for (const val of tests) {
				expect(serializeCacheValue(val)).toBe(val);
			}
		});

		it("leaves strings untouched", () => {
			const tests = ["1", "2", "6", "7", "-1", "0.15"];
			for (const val of tests) {
				expect(serializeCacheValue(val)).toBe(val);
			}
		});

		it("leaves booleans untouched", () => {
			expect(serializeCacheValue(true)).toBeTrue();
		});

		it("leaves arrays untouched", () => {
			const tests = [[], [1, 2, "3"], [false]];
			for (const val of tests) {
				expect(serializeCacheValue(val)).toBe(val);
			}
		});

		it("leaves objects untouched", () => {
			const tests = [{}, { foo: "bar", baz: "inga" }, { 0: 1 }];
			for (const val of tests) {
				expect(serializeCacheValue(val)).toEqual(val);
			}
		});

		it("converts Maps into objects", () => {
			const input = new Map<any, any>([["foo", "bar"], [0, 1]]);
			const expected = { foo: "bar", 0: 1 };
			expect(serializeCacheValue(input)).toEqual(expected);
		});
	});
});
