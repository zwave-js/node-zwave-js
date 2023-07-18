import test from "ava";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveError } from "../test/assertZWaveError";
import {
	UNKNOWN_STATE,
	encodeBitMask,
	encodeFloatWithScale,
	encodePartial,
	getMinIntegerSize,
	parseBitMask,
	parseBoolean,
	parseFloatWithScale,
	parseMaybeBoolean,
	parseMaybeNumber,
	parseNumber,
	parsePartial,
} from "./Primitive";

test("parseBoolean() -> should return false when the value is 0", (t) => {
	t.false(parseBoolean(0));
});

test("parseBoolean() -> should return true when the value is 0xff", (t) => {
	t.true(parseBoolean(0xff));
});

test("parseBoolean() -> should return undefined otherwise", (t) => {
	t.is(parseBoolean(0x80), undefined);
});

test("parseMaybeBoolean() -> should return false when the value is 0", (t) => {
	t.false(parseMaybeBoolean(0));
});

test("parseMaybeBoolean() -> should return true when the value is 0xff", (t) => {
	t.true(parseMaybeBoolean(0xff));
});

test("parseMaybeBoolean() -> should return unknown when the value is 0xfe", (t) => {
	t.is(parseMaybeBoolean(0xfe), UNKNOWN_STATE);
});

test("parseMaybeBoolean() -> should return undefined otherwise", (t) => {
	t.is(parseMaybeBoolean(0x80), undefined);
});

test("parseNumber() -> should return the value when it is in the range 0..99", (t) => {
	for (let i = 0; i <= 99; i++) {
		t.is(parseNumber(i), i);
	}
});

test("parseNumber() -> should return 99 when the value is 0xff", (t) => {
	t.is(parseNumber(0xff), 99);
});

test("parseNumber() -> should return undefined otherwise", (t) => {
	t.is(parseNumber(0x80), undefined);
});

test("parseMaybeNumber() -> should return the value when it is in the range 0..99", (t) => {
	for (let i = 0; i <= 99; i++) {
		t.is(parseMaybeNumber(i), i);
	}
});

test("parseMaybeNumber() -> should return 99 when the value is 0xff", (t) => {
	t.is(parseMaybeNumber(0xff), 99);
});

test("parseMaybeNumber() -> should return unknown when the value is 0xfe", (t) => {
	t.is(parseMaybeNumber(0xfe), UNKNOWN_STATE);
});

test("parseMaybeNumber() -> should return undefined otherwise", (t) => {
	t.is(parseMaybeNumber(0x80), undefined);
});

test("parseFloatWithScale() -> should correctly extract the scale", (t) => {
	const tests = [
		{ payload: Buffer.from([0b00000001, 0]), expected: 0b00 },
		{ payload: Buffer.from([0b00001001, 0]), expected: 0b01 },
		{ payload: Buffer.from([0b00010001, 0]), expected: 0b10 },
		{ payload: Buffer.from([0b00011001, 0]), expected: 0b11 },
	];
	for (const { payload, expected } of tests) {
		t.is(parseFloatWithScale(payload).scale, expected);
	}
});

test("parseFloatWithScale() -> should correctly extract the value", (t) => {
	const tests = [
		{
			payload: Buffer.from([0b00100001, 15]),
			expected: 1.5,
			numDigits: 1,
		},
		{
			payload: Buffer.from([0b11001100, 0x81, 0x23, 0x45, 0x67]),
			expected: -2128.394905,
			numDigits: 6,
		},
	];
	for (const { payload, expected, numDigits } of tests) {
		const diff = Math.abs(expected - parseFloatWithScale(payload).value);
		const allowed = 10 ** -numDigits / 2;
		t.true(diff < allowed);
	}
});

test("encodeFloatWithScale() -> should correctly encode the scale", (t) => {
	const tests = [
		{
			scale: 0b00,
			value: 0,
			expected: Buffer.from([0b00000001, 0]),
		},
		{
			scale: 0b01,
			value: 0,
			expected: Buffer.from([0b00001001, 0]),
		},
		{
			scale: 0b10,
			value: 0,
			expected: Buffer.from([0b00010001, 0]),
		},
		{
			scale: 0b11,
			value: 0,
			expected: Buffer.from([0b00011001, 0]),
		},
	];
	for (const { scale, value, expected } of tests) {
		t.true(encodeFloatWithScale(value, scale).equals(expected));
	}
});

test("encodeFloatWithScale() -> should correctly determine the minimum necessary size", (t) => {
	const tests = [
		{ value: 0, expected: 1 },
		{ value: -1, expected: 1 },
		{ value: -128, expected: 1 },
		{ value: 128, expected: 2 },
		{ value: -32768, expected: 2 },
		{ value: 32768, expected: 4 },
	];
	for (const { value, expected } of tests) {
		t.is(encodeFloatWithScale(value, 0).length, expected + 1);
	}
});

test("encodeFloatWithScale() -> should correctly detect the necessary precision and serialize the given values", (t) => {
	const tests = [
		{
			value: 1.5,
			scale: 0b00,
			expected: Buffer.from([0b00100001, 15]),
		},
		{
			value: -2128.394905,
			scale: 0b01,
			expected: Buffer.from([0b11001100, 0x81, 0x23, 0x45, 0x67]),
		},
	];
	for (const { scale, value, expected } of tests) {
		t.deepEqual(encodeFloatWithScale(value, scale), expected);
	}
});

test("encodeFloatWithScale() -> should use the specified override options", (t) => {
	const tests = [
		{
			scale: 0b00,
			value: 0,
			override: { size: 2 }, // Force 2 bytes for the value
			expected: Buffer.from([0b000_00_010, 0, 0]),
		},
		{
			scale: 0b01,
			value: 100,
			override: { precision: 2 }, // Force 2 decimal digits
			// resulting in 2 bytes size
			expected: Buffer.from([0b010_01_010, 0x27, 0x10]),
		},
		{
			scale: 0b10,
			value: 100,
			override: { precision: 1, size: 3 },
			expected: Buffer.from([0b001_10_011, 0, 0x03, 0xe8]),
		},
	];
	for (const { scale, value, override, expected } of tests) {
		t.deepEqual(encodeFloatWithScale(value, scale, override), expected);
	}
});

test("encodeFloatWithScale() -> should fall back to sane options when the override is invalid", (t) => {
	const tests = [
		{
			scale: 0b10,
			value: 100,
			override: { precision: 1, size: 1 }, // invalid, this requires a size of at least 2
			expected: Buffer.from([0b001_10_010, 0x03, 0xe8]),
		},
	];
	for (const { scale, value, override, expected } of tests) {
		t.deepEqual(encodeFloatWithScale(value, scale, override), expected);
	}
});

test("encodeFloatWithScale() -> should throw when the value cannot be represented in 4 bytes", (t) => {
	assertZWaveError(t, () => encodeFloatWithScale(0xffffffff, 0), {
		errorCode: ZWaveErrorCodes.Arithmetic,
	});
	assertZWaveError(t, () => encodeFloatWithScale(Number.NaN, 0), {
		errorCode: ZWaveErrorCodes.Arithmetic,
	});
});
test("parseBitMask() -> should correctly convert a bit mask into a numeric array", (t) => {
	const tests = [
		{ mask: Buffer.from([0b10111001]), expected: [1, 4, 5, 6, 8] },
		{ mask: Buffer.from([0b11, 0b110]), expected: [1, 2, 10, 11] },
	];
	for (const { mask, expected } of tests) {
		t.deepEqual(parseBitMask(mask), expected);
	}
});

test("parseBitMask() -> should take the 2nd parameter into account when calculating the resulting values", (t) => {
	const tests = [
		{
			mask: Buffer.from([0b10111001]),
			startValue: 0,
			expected: [0, 3, 4, 5, 7],
		},
		{
			mask: Buffer.from([0b10111001]),
			startValue: 1,
			expected: [1, 4, 5, 6, 8],
		},
		{
			mask: Buffer.from([0b10111001]),
			startValue: 2,
			expected: [2, 5, 6, 7, 9],
		},
		{
			mask: Buffer.from([0b11, 0b110]),
			startValue: 3,
			expected: [3, 4, 12, 13],
		},
	];
	for (const { mask, startValue, expected } of tests) {
		t.deepEqual(parseBitMask(mask, startValue), expected);
	}
});

test("encodeBitMask() -> should correctly convert a numeric array into a bit mask", (t) => {
	const tests = [
		{
			values: [1, 4, 5, 6, 8],
			max: 8,
			expected: Buffer.from([0b10111001]),
		},
		{
			values: [1, 2, 10, 11],
			max: 16,
			expected: Buffer.from([0b11, 0b110]),
		},
	];
	for (const { values, max, expected } of tests) {
		t.deepEqual(encodeBitMask(values, max), expected);
	}
});

test("encodeBitMask() -> should respect the maxValue argument for determining the buffer length", (t) => {
	const tests = [
		{ values: [1, 4, 5, 6, 8], max: 17, expectedLength: 3 },
		{ values: [1, 2, 10, 11], max: 3, expectedLength: 1 },
	];
	for (const { values, max, expectedLength } of tests) {
		t.is(encodeBitMask(values, max).length, expectedLength);
	}
});

test("encodeBitMask() -> should respect the startValue too", (t) => {
	const tests = [
		{
			values: [2, 4, 8],
			max: 11,
			startValue: 2,
			expected: Buffer.from([0b01000101, 0]),
		},
		{
			values: [0, 2, 10, 11],
			max: 19,
			startValue: 0,
			expected: Buffer.from([0b101, 0b1100, 0]),
		},
	];
	for (const { values, max, startValue, expected } of tests) {
		t.deepEqual(encodeBitMask(values, max, startValue), expected);
	}
});

test("getMinIntegerSize(signed) -> should return 1 for numbers from -128 to 127", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, true), 1);
	}
	[-128, -1, 0, 1, 127].forEach(test);
});

test("getMinIntegerSize(signed) -> should return 2 for numbers from -32768 to 32767", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, true), 2);
	}
	[-32768, -129, 128, 32767].forEach(test);
});

test("getMinIntegerSize(signed) -> should return 4 for numbers from -2147483648 to 2147483647", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, true), 4);
	}
	[-2147483648, -32769, 32768, 2147483647].forEach(test);
});

test("getMinIntegerSize(signed) -> should return undefined for larger and smaller numbers", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, true), undefined);
	}
	[
		Number.MIN_SAFE_INTEGER,
		-2147483649,
		2147483648,
		Number.MAX_SAFE_INTEGER,
	].forEach(test);
});

test("getMinIntegerSize(unsigned) -> should return 1 for numbers from 0 to 255", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, false), 1);
	}
	[0, 1, 254, 255].forEach(test);
});

test("getMinIntegerSize(unsigned) -> should return 2 for numbers from 256 to 65535", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, false), 2);
	}
	[256, 257, 65534, 65535].forEach(test);
});

test("getMinIntegerSize(unsigned) -> should return 4 for numbers from 65536 to 4294967295", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, false), 4);
	}
	[65536, 65537, 4294967294, 4294967295].forEach(test);
});

test("getMinIntegerSize(unsigned) -> should return undefined for larger and smaller numbers", (t) => {
	function test(val: number) {
		t.is(getMinIntegerSize(val, false), undefined);
	}
	[Number.MIN_SAFE_INTEGER, -1, 4294967296, Number.MAX_SAFE_INTEGER].forEach(
		test,
	);
});

test("parsePartial() -> should work correctly for unsigned partials", (t) => {
	const tests = [
		{
			value: 0b11110000,
			bitMask: 0b00111100,
			expected: 0b1100,
		},
		{
			value: -128, // 10000000
			bitMask: 0b11000000,
			expected: 2,
		},
	];
	for (const { value, bitMask, expected } of tests) {
		t.is(parsePartial(value, bitMask, false), expected);
	}
});

test("parsePartial() -> should work correctly for signed partials", (t) => {
	const tests = [
		{
			value: 0b11_1110_00,
			bitMask: 0b00_1111_00,
			expected: -2, // 1...110
		},
		{
			value: -8, // same as above
			bitMask: 0b00_1111_00,
			expected: -2, // 1...110
		},
		{
			value: 0b11_1110_00,
			bitMask: 0b11_0000_00,
			expected: -1, // 1...1
		},
		{
			value: 0b11_0110_00,
			bitMask: 0b00_1111_00,
			expected: 6,
		},
	];
	for (const { value, bitMask, expected } of tests) {
		t.is(parsePartial(value, bitMask, true), expected);
	}
});

test("encodePartial() -> should work correctly for signed and unsigned partials", (t) => {
	const tests = [
		{
			fullValue: 0b11_01_1111,
			partialValue: 0b10,
			bitMask: 0b00_11_0000,
			expected: 0b11_10_1111,
		},
		{
			fullValue: 0b11_01_1111,
			partialValue: -2, // same as above, but interpreted as signed
			bitMask: 0b00_11_0000,
			expected: 0b11_10_1111,
		},
		// Bit shifting with 4-byte values can cause them to get interpreted as signed
		{
			fullValue: 0xffff0000,
			partialValue: 0x0000aaaa,
			bitMask: 0x0000ffff,
			expected: 0xffffaaaa,
		},
	];
	for (const { fullValue, partialValue, bitMask, expected } of tests) {
		t.is(encodePartial(fullValue, partialValue, bitMask), expected);
	}
});
