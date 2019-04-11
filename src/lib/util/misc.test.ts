/// <reference types="jest-extended" />
import { isConsecutiveArray } from "./misc";

describe("lib/util/misc", () => {
	describe("isConsecutiveArray()", () => {
		it("returns true for consecutive arrays", () => {
			// prettier-ignore
			const tests = [
				[1], 
				[1, 2, 3], 
				[2, 3, 4], 
				[-2, -1, 0]
			];
			for (const test of tests) {
				expect(isConsecutiveArray(test)).toBeTrue();
			}
		});

		it("returns true for empty arrays", () => {
			expect(isConsecutiveArray([])).toBeTrue();
		});

		it("returns false otherwise", () => {
			// prettier-ignore
			const tests = [
				[1, 3], 
				[1, 2, 3, 2], 
			];
			for (const test of tests) {
				expect(isConsecutiveArray(test)).toBeFalse();
			}
		});
	});
});
