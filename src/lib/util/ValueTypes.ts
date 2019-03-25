type Brand<K, T> = K & { __brand: T };

export type BrandedUnknown<T> = Brand<"unknown", T>;
export type Maybe<T> = T | BrandedUnknown<T>;

export const unknownNumber = "unknown" as Maybe<number>;
export const unknownBoolean = "unknown" as Maybe<boolean>;

export function parseMaybeBoolean(val: number): Maybe<boolean> | undefined {
	return val === 0 ? false :
		val === 0xff ? true :
		val === 0xfe ? unknownBoolean :
		undefined;
}

export function parseBoolean(val: number): boolean | undefined {
	return val === 0 ? false :
		val === 0xff ? true :
		undefined;
}

export function parseMaybeNumber(val: number): Maybe<number> | undefined {
	return val <= 100 ? val :
		val === 0xff ? 100 :
		val === 0xfe ? unknownNumber :
		undefined;
}

export function parseNumber(val: number): number | undefined {
	return val <= 100 ? val :
		val === 0xff ? 100 :
		undefined;
}
