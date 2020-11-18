import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";

type Brand<K, T> = K & { __brand: T };

type BrandedUnknown<T> = Brand<"unknown", T>;
export type Maybe<T> = T | BrandedUnknown<T>;

export const unknownNumber = "unknown" as Maybe<number>;
export const unknownBoolean = "unknown" as Maybe<boolean>;

/** Parses a boolean that is encoded as a single byte and might also be "unknown" */
export function parseMaybeBoolean(val: number): Maybe<boolean> | undefined {
	return val === 0xfe ? unknownBoolean : parseBoolean(val);
}

/** Parses a boolean that is encoded as a single byte */
export function parseBoolean(val: number): boolean | undefined {
	return val === 0 ? false : val === 0xff ? true : undefined;
}

/** Parses a single-byte number from 0 to 100, which might also be "unknown" */
export function parseMaybeNumber(val: number): Maybe<number> | undefined {
	return val === 0xfe ? unknownNumber : parseNumber(val);
}

/** Parses a single-byte number from 0 to 100 */
export function parseNumber(val: number): number | undefined {
	return val <= 99 ? val : val === 0xff ? 99 : undefined;
}

/** Parses a floating point value with a scale from a buffer */
export function parseFloatWithScale(
	payload: Buffer,
): { value: number; scale: number; bytesRead: number } {
	validatePayload(payload.length >= 1);
	const precision = (payload[0] & 0b111_00_000) >>> 5;
	const scale = (payload[0] & 0b000_11_000) >>> 3;
	const size = payload[0] & 0b111;
	validatePayload(size >= 1, size <= 4, payload.length >= 1 + size);
	const value = payload.readIntBE(1, size) / Math.pow(10, precision);
	return { value, scale, bytesRead: 1 + size };
}

function getPrecision(num: number): number {
	if (!Number.isFinite(num)) return 0;
	let e = 1;
	let p = 0;
	while (Math.round(num * e) / e !== num) {
		e *= 10;
		p++;
	}
	return p;
}

/** The minimum and maximum values that can be stored in each numeric value type */
export const IntegerLimits = Object.freeze({
	UInt8: Object.freeze({ min: 0, max: 0xff }),
	UInt16: Object.freeze({ min: 0, max: 0xffff }),
	UInt24: Object.freeze({ min: 0, max: 0xffffff }),
	UInt32: Object.freeze({ min: 0, max: 0xffffffff }),
	Int8: Object.freeze({ min: -0x80, max: 0x7f }),
	Int16: Object.freeze({ min: -0x8000, max: 0x7fff }),
	Int24: Object.freeze({ min: -0x800000, max: 0x7fffff }),
	Int32: Object.freeze({ min: -0x80000000, max: 0x7fffffff }),
});

export function getMinIntegerSize(
	value: number,
	signed: boolean,
): 1 | 2 | 4 | undefined {
	if (signed) {
		if (value >= IntegerLimits.Int8.min && value <= IntegerLimits.Int8.max)
			return 1;
		else if (
			value >= IntegerLimits.Int16.min &&
			value <= IntegerLimits.Int16.max
		)
			return 2;
		else if (
			value >= IntegerLimits.Int32.min &&
			value <= IntegerLimits.Int32.max
		)
			return 4;
	} else if (value >= 0) {
		if (value <= IntegerLimits.UInt8.max) return 1;
		if (value <= IntegerLimits.UInt16.max) return 2;
		if (value <= IntegerLimits.UInt32.max) return 4;
	}
	// Not a valid size
}

export function getIntegerLimits(
	size: 1 | 2 | 3 | 4,
	signed: boolean,
): { min: number; max: number } {
	return (IntegerLimits as any)[`${signed ? "" : "U"}Int${size * 8}`];
}

/** Encodes a floating point value with a scale into a buffer */
export function encodeFloatWithScale(value: number, scale: number): Buffer {
	const precision = Math.min(getPrecision(value), 7);
	value = Math.round(value * Math.pow(10, precision));
	const size: number | undefined = getMinIntegerSize(value, true);
	if (size == undefined) {
		throw new ZWaveError(
			`Cannot encode the value ${value} because its too large or too small to fit into 4 bytes`,
			ZWaveErrorCodes.Arithmetic,
		);
	}
	const ret = Buffer.allocUnsafe(1 + size);
	ret[0] =
		((precision & 0b111) << 5) | ((scale & 0b11) << 3) | (size & 0b111);
	ret.writeIntBE(value, 1, size);
	return ret;
}

/** Parses a bit mask into a numeric array */
export function parseBitMask(mask: Buffer, startValue: number = 1): number[] {
	const numBits = mask.length * 8;

	const ret: number[] = [];
	for (let index = 1; index <= numBits; index++) {
		const byteNum = (index - 1) >>> 3; // id / 8
		const bitNum = (index - 1) % 8;
		if ((mask[byteNum] & (2 ** bitNum)) !== 0)
			ret.push(index + startValue - 1);
	}
	return ret;
}

/** Serializes a numeric array with a given maximum into a bit mask */
export function encodeBitMask(
	values: number[],
	maxValue: number,
	startValue: number = 1,
): Buffer {
	const numBytes = Math.ceil((maxValue - startValue + 1) / 8);
	const ret = Buffer.alloc(numBytes, 0);
	for (let val = startValue; val <= maxValue; val++) {
		if (values.indexOf(val) === -1) continue;
		const byteNum = (val - startValue) >>> 3; // id / 8
		const bitNum = (val - startValue) % 8;
		ret[byteNum] |= 2 ** bitNum;
	}
	return ret;
}
