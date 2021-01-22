import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveError } from "../test/assertZWaveError";
import {
	getMinimumShiftForBitMask,
	isConsecutiveArray,
	stripUndefined,
	validatePayload,
} from "./misc";

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

	describe("stripUndefined()", () => {
		it("keeps objects with no undefined properties as-is", () => {
			const obj = {
				foo: "bar",
				bar: 1,
				baz: true,
			};
			expect(stripUndefined(obj)).toEqual(obj);
		});

		it("removes undefined properties from objects", () => {
			const obj = {
				foo: "bar",
				bar: undefined,
				baz: true,
			};
			const expected = {
				foo: "bar",
				baz: true,
			};
			expect(stripUndefined(obj)).toEqual(expected);
		});

		it("does not touch nested properties", () => {
			const obj = {
				foo: "bar",
				bar: { sub: undefined },
				baz: true,
			};
			expect(stripUndefined(obj)).toEqual(obj);
		});
	});

	describe("validatePayload()", () => {
		it("passes when no arguments were given", () => {
			validatePayload();
		});

		it("passes when all arguments are truthy", () => {
			validatePayload(1);
			validatePayload(true, "true");
			validatePayload({});
		});

		it("throws a ZWaveError with PacketFormat_InvalidPayload otherwise", () => {
			for (const args of [[false], [true, 0, true]]) {
				assertZWaveError(() => validatePayload(...args), {
					errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
				});
			}
		});

		it("The error message should contain the rejection reason", () => {
			assertZWaveError(() => validatePayload.withReason("NOPE")(false), {
				errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
				context: "NOPE",
			});
		});
	});

	describe("getMinimumShiftForBitMask", () => {
		it("returns 0 if the mask is 0", () => {
			expect(getMinimumShiftForBitMask(0)).toBe(0);
		});

		it("returns the correct bit shift for sensible bit masks", () => {
			const tests = [
				{ input: 0b1, expected: 0 },
				{ input: 0b10, expected: 1 },
				{ input: 0b100, expected: 2 },
				{ input: 0b1000, expected: 3 },
				{ input: 0b1010, expected: 1 },
				{ input: 0b1100, expected: 2 },
				{ input: 0b1111, expected: 0 },
				{ input: 0b1011, expected: 0 },
			];
			for (const { input, expected } of tests) {
				expect(getMinimumShiftForBitMask(input)).toBe(expected);
			}
		});
	});
});
