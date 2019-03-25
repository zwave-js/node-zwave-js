import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";

type Brand<K, T> = K & { __brand: T };

export type BrandedUnknown<T> = Brand<"unknown", T>;
export type Maybe<T> = T | BrandedUnknown<T>;

export const unknownNumber = "unknown" as Maybe<number>;
export const unknownBoolean = "unknown" as Maybe<boolean>;

/** Parses a boolean that is encoded as a single byte and might also be "unknown" */
export function parseMaybeBoolean(val: number): Maybe<boolean> | undefined {
	return val === 0xfe ? unknownBoolean : parseBoolean(val);
}

/** Parses a boolean that is encoded as a single byte */
export function parseBoolean(val: number): boolean | undefined {
	return val === 0 ? false :
		val === 0xff ? true :
			undefined;
}

/** Parses a single-byte number from 0 to 100, which might also be "unknown" */
export function parseMaybeNumber(val: number): Maybe<number> | undefined {
	return val === 0xfe ? unknownNumber : parseNumber(val);
}

/** Parses a single-byte number from 0 to 100 */
export function parseNumber(val: number): number | undefined {
	return val <= 100 ? val :
		val === 0xff ? 100 :
			undefined;
}

/** Parses a floating point value with a scale from a buffer */
export function parseFloatWithScale(payload: Buffer): { value: number, scale: number } {
	const precision = (payload[0] & 0b111_00_000) >>> 5;
	const scale = (payload[0] & 0b000_11_000) >>> 3;
	const size = payload[0] & 0b111;
	const value = payload.readIntBE(1, size) / Math.pow(10, precision);
	return { value, scale };
}

function getPrecision(num: number) {
	if (!Number.isFinite(num)) return 0;
	let e = 1;
	let p = 0;
	while (Math.round(num * e) / e !== num) { e *= 10; p++; }
	return p;
}

/** Encodes a floating point value with a scale into a buffer */
export function encodeFloatWithScale(value: number, scale: number) {
	const precision = Math.min(getPrecision(value), 7);
	value = Math.round(value * Math.pow(10, precision));
	let size: number;
	if (value >= -128 && value <= 127) size = 1;
	else if (value >= -32768 && value <= 32767) size = 2;
	else if (value >= -2147483648 && value <= 2147483647) size = 4;
	else {
		throw new ZWaveError(
			`Cannot encode the value ${value} because its too large or too small to fit into 4 bytes`,
			ZWaveErrorCodes.Arithmetic,
		);
	}
	const ret = Buffer.allocUnsafe(1 + size);
	ret[0] = ((precision & 0b111) << 5) | ((scale & 0b11) << 3) | (size & 0b111);
	ret.writeIntBE(value, 1, size);
	return ret;
}
