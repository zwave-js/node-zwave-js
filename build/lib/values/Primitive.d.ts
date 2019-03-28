/// <reference types="node" />
declare type Brand<K, T> = K & {
    __brand: T;
};
export declare type BrandedUnknown<T> = Brand<"unknown", T>;
export declare type Maybe<T> = T | BrandedUnknown<T>;
export declare const unknownNumber: Maybe<number>;
export declare const unknownBoolean: Maybe<boolean>;
/** Parses a boolean that is encoded as a single byte and might also be "unknown" */
export declare function parseMaybeBoolean(val: number): Maybe<boolean> | undefined;
/** Parses a boolean that is encoded as a single byte */
export declare function parseBoolean(val: number): boolean | undefined;
/** Parses a single-byte number from 0 to 100, which might also be "unknown" */
export declare function parseMaybeNumber(val: number): Maybe<number> | undefined;
/** Parses a single-byte number from 0 to 100 */
export declare function parseNumber(val: number): number | undefined;
/** Parses a floating point value with a scale from a buffer */
export declare function parseFloatWithScale(payload: Buffer): {
    value: number;
    scale: number;
    bytesRead: number;
};
/** Encodes a floating point value with a scale into a buffer */
export declare function encodeFloatWithScale(value: number, scale: number): Buffer;
/** Parses a bit mask into a numeric array */
export declare function parseBitMask(mask: Buffer): number[];
/** Serializes a numeric array with a given maximum into a bit mask */
export declare function encodeBitMask(values: number[], maxValue: number): Buffer;
export {};
