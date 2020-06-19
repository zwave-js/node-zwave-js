import { num2hex } from "./strings";

/** Object.keys, but with `(keyof T)[]` as the return type */
export function keysOf<T>(obj: T): (keyof T)[] {
	return (Object.keys(obj) as unknown) as (keyof T)[];
}

/** Returns a subset of `obj` that contains only the given keys */
export function pick<T extends Record<any, any>, K extends keyof T>(
	obj: T,
	keys: K[],
): Pick<T, K> {
	const ret = {} as Pick<T, K>;
	for (const key of keys) {
		if (key in obj) ret[key] = obj[key];
	}
	return ret;
}

/** Calls the map function of the given array and flattens the result by one level */
export function flatMap<U, T extends any[]>(
	array: T[],
	callbackfn: (value: T, index: number, array: T[]) => U[],
): U[] {
	const mapped = array.map(callbackfn);
	return mapped.reduce((acc, cur) => [...acc, ...cur], [] as U[]);
}

export function getEnumMemberName(enumeration: unknown, value: number): string {
	return (enumeration as any)[value] || `unknown (${num2hex(value)})`;
}

/** Skips the first n bytes of a buffer and returns the rest */
export function skipBytes(buf: Buffer, n: number): Buffer {
	return Buffer.from(buf.slice(n));
}
