import test from "ava";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { assertZWaveError } from "../test/assertZWaveError";
import {
	getLegalRangeForBitMask,
	getMinimumShiftForBitMask,
	isConsecutiveArray,
	stripUndefined,
	validatePayload,
} from "./misc";

test("isConsecutiveArray() -> returns true for consecutive arrays", (t) => {
	// prettier-ignore
	const tests = [
		[1], 
		[1, 2, 3], 
		[2, 3, 4], 
		[-2, -1, 0]
	];
	for (const test of tests) {
		t.true(isConsecutiveArray(test));
	}
});

test("isConsecutiveArray() -> returns true for empty arrays", (t) => {
	t.true(isConsecutiveArray([]));
});

test("isConsecutiveArray() -> returns false otherwise", (t) => {
	// prettier-ignore
	const tests = [
		[1, 3],
		[1, 2, 3, 2],
	];
	for (const test of tests) {
		t.false(isConsecutiveArray(test));
	}
});

test("stripUndefined() -> keeps objects with no undefined properties as-is", (t) => {
	const obj = {
		foo: "bar",
		bar: 1,
		baz: true,
	};
	t.deepEqual(stripUndefined(obj), obj);
});

test("stripUndefined() -> removes undefined properties from objects", (t) => {
	const obj = {
		foo: "bar",
		bar: undefined,
		baz: true,
	};
	const expected = {
		foo: "bar",
		baz: true,
	};
	t.deepEqual(stripUndefined(obj), expected);
});

test("stripUndefined() -> does not touch nested properties", (t) => {
	const obj = {
		foo: "bar",
		bar: { sub: undefined },
		baz: true,
	};
	t.deepEqual(stripUndefined(obj), obj);
});

test("validatePayload() -> passes when no arguments were given", (t) => {
	validatePayload();
	t.pass();
});

test("validatePayload() -> passes when all arguments are truthy", (t) => {
	validatePayload(1);
	validatePayload(true, "true");
	validatePayload({});
	t.pass();
});

test("validatePayload() -> throws a ZWaveError with PacketFormat_InvalidPayload otherwise", (t) => {
	for (const args of [[false], [true, 0, true]]) {
		assertZWaveError(t, () => validatePayload(...args), {
			errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
		});
	}
	t.pass();
});

test("validatePayload() -> The error message should contain the rejection reason", (t) => {
	assertZWaveError(t, () => validatePayload.withReason("NOPE")(false), {
		errorCode: ZWaveErrorCodes.PacketFormat_InvalidPayload,
		context: "NOPE",
	});
	t.pass();
});

test("getMinimumShiftForBitMask() -> returns 0 if the mask is 0", (t) => {
	t.is(getMinimumShiftForBitMask(0), 0);
});

test("getMinimumShiftForBitMask() -> returns the correct bit shift for sensible bit masks", (t) => {
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
		t.is(getMinimumShiftForBitMask(input), expected);
	}
});

test("getLegalRangeForBitMask() -> returns [0,0] if the mask is 0", (t) => {
	t.deepEqual(getLegalRangeForBitMask(0, true), [0, 0]);
	t.deepEqual(getLegalRangeForBitMask(0, false), [0, 0]);
});

test("getLegalRangeForBitMask returns the correct ranges otherwise", (t) => {
	const tests = [
		// 1-bit masks always match [0,1]
		{ mask: 0b1, expSigned: [0, 1], expUnsigned: [0, 1] },
		{ mask: 0b10, expSigned: [0, 1], expUnsigned: [0, 1] },
		{ mask: 0b100, expSigned: [0, 1], expUnsigned: [0, 1] },
		{ mask: 0b1000, expSigned: [0, 1], expUnsigned: [0, 1] },
		{ mask: 0b1010, expSigned: [-4, 3], expUnsigned: [0, 7] },
		{ mask: 0b1100, expSigned: [-2, 1], expUnsigned: [0, 3] },
		{ mask: 0b1111, expSigned: [-8, 7], expUnsigned: [0, 15] },
		{ mask: 0b1011, expSigned: [-8, 7], expUnsigned: [0, 15] },
	];
	for (const { mask, expSigned, expUnsigned } of tests) {
		t.deepEqual(getLegalRangeForBitMask(mask, true), expUnsigned);
		t.deepEqual(getLegalRangeForBitMask(mask, false), expSigned);
	}
});
