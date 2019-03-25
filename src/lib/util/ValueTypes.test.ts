import { encodeFloatWithScale, parseFloatWithScale } from "./ValueTypes";

describe("lib/util/ValueTypes", () => {

	describe("parseFloatWithScale()", () => {
		it("should correctly extract the scale", () => {
			const tests = [
				{ payload: Buffer.from([0b00000001, 0]), expected: 0b00 },
				{ payload: Buffer.from([0b00001001, 0]), expected: 0b01 },
				{ payload: Buffer.from([0b00010001, 0]), expected: 0b10 },
				{ payload: Buffer.from([0b00011001, 0]), expected: 0b11 },
			];
			for (const { payload, expected } of tests) {
				expect(parseFloatWithScale(payload).scale).toBe(expected);
			}
		});

		it("should correctly extract the value", () => {
			const tests = [
				{ payload: Buffer.from([0b00100001, 15]), expected: 1.5, numDigits: 1 },
				{ payload: Buffer.from([0b11001100, 0x81, 0x23, 0x45, 0x67]), expected: -2128.394905, numDigits: 6 },
			];
			for (const { payload, expected, numDigits } of tests) {
				expect(parseFloatWithScale(payload).value).toBeCloseTo(expected, numDigits);
			}
		});
	});

	describe("encodeFloatWithScale()", () => {
		it("should correctly encode the scale", () => {
			const tests = [
				{ scale: 0b00, value: 0, expected: Buffer.from([0b00000001, 0]) },
				{ scale: 0b01, value: 0, expected: Buffer.from([0b00001001, 0]) },
				{ scale: 0b10, value: 0, expected: Buffer.from([0b00010001, 0]) },
				{ scale: 0b11, value: 0, expected: Buffer.from([0b00011001, 0]) },
			];
			for (const { scale, value, expected } of tests) {
				expect(encodeFloatWithScale(value, scale).equals(expected)).toBeTrue();
			}
		});

		it("should correctly determine the minimum necessary size", () => {
			const tests = [
				{ value: 0, expected: 1 },
				{ value: -1, expected: 1 },
				{ value: -128, expected: 1 },
				{ value: 128, expected: 2 },
				{ value: -32768, expected: 2 },
				{ value: 32768, expected: 4 },
			];
			for (const { value, expected } of tests) {
				expect(encodeFloatWithScale(value, 0).length).toBe(expected + 1);
			}
		});

		it("should correctly detect the necessary precision and serialize the given values", () => {
			const tests = [
				{ value: 1.5, scale: 0b00, expected: Buffer.from([0b00100001, 15]) },
				{ value: -2128.394905, scale: 0b01, expected: Buffer.from([0b11001100, 0x81, 0x23, 0x45, 0x67]) },
			];
			for (const { scale, value, expected } of tests) {
				expect(encodeFloatWithScale(value, scale).equals(expected)).toBeTrue();
			}
		});

	});

});
