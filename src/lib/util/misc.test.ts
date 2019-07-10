import { assertZWaveError } from "../../../test/util";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { isConsecutiveArray, stripUndefined, validatePayload } from "./misc";

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
	});
});
