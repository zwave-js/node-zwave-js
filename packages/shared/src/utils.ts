import { isArray, isObject } from "alcalzone-shared/typeguards";

import { num2hex } from "./strings.js";

/** Object.keys, but with `(keyof T)[]` as the return type */
export function keysOf<T extends object>(obj: T): (keyof T)[] {
	return Object.keys(obj) as unknown as (keyof T)[];
}

/** Returns a subset of `obj` that contains only the given keys */
export function pick<T extends Record<any, any>, K extends keyof T>(
	obj: T,
	keys: readonly K[],
): Pick<T, K> {
	const ret = {} as Pick<T, K>;
	for (const key of keys) {
		if (key in obj) ret[key] = obj[key];
	}
	return ret;
}

/**
 * Traverses an object and returns the property identified by the given path. For example, picking from
 * ```json
 * {
 *  "foo": {
 *   "bar": [
 *     1, 2, 3
 *   ]
 * }
 * ```
 * with path `foo.bar.1` will return `2`.
 */
export function pickDeep<T = unknown>(
	object: Record<string, any>,
	path: string,
): T {
	function _pickDeep(obj: Record<string, any>, pathArr: string[]): unknown {
		// are we there yet? then return obj
		if (!pathArr.length) return obj;
		// are we not looking at an object or array? Then bail
		if (!isObject(obj) && !isArray(obj)) return undefined;
		// go deeper
		const propName = pathArr.shift()!;
		return _pickDeep(obj[propName], pathArr);
	}
	return _pickDeep(object, path.split(".")) as T;
}

/**
 * Returns a human-readable representation of the given enum value.
 * If the given value is not found in the enum object, `"unknown (<value-as-hex>)"` is returned.
 *
 * @param enumeration The enumeration object the value comes from
 * @param value The enum value to be pretty-printed
 */
export function getEnumMemberName(enumeration: unknown, value: number): string {
	return (enumeration as any)[value] || `unknown (${num2hex(value)})`;
}

/**
 * Checks if the given value is a member of the given enum object.
 *
 * @param enumeration The enumeration object the value comes from
 * @param value The enum value to be pretty-printed
 */
export function isEnumMember(enumeration: unknown, value: number): boolean {
	return typeof (enumeration as any)[value] === "string";
}

/**
 * Returns a throttled version of the given function. No matter how often the throttled version is called,
 * the underlying function is only called at maximum every `intervalMs` milliseconds.
 */
export function throttle<T extends any[]>(
	fn: (...args: T) => void,
	intervalMs: number,
	trailing: boolean = false,
): (...args: T) => void {
	let lastCall = 0;
	let timeout: NodeJS.Timeout | undefined;
	return (...args: T) => {
		const now = Date.now();
		if (now >= lastCall + intervalMs) {
			// waited long enough, call now
			lastCall = now;
			fn(...args);
		} else if (trailing) {
			if (timeout) clearTimeout(timeout);
			const delay = lastCall + intervalMs - now;
			timeout = setTimeout(() => {
				lastCall = Date.now();
				fn(...args);
			}, delay);
		}
	};
}

/**
 * Merges the user-defined options with the default options
 */
export function mergeDeep(
	target: Record<string, any> | undefined,
	source: Record<string, any>,
	overwrite?: boolean,
): Record<string, any> {
	target = target || {};
	for (const [key, value] of Object.entries(source)) {
		// Skip `__proto__` because assigning or merging into it changes a prototype
		if (key === "__proto__") continue;
		const exists = Object.hasOwn(target, key);
		if (value === undefined) {
			// Explicitly delete keys that were set to `undefined`, but only if overwriting is enabled
			if (overwrite && exists) delete target[key];
		} else if (
			exists
			&& isPlainObject(target[key])
			&& isPlainObject(value)
		) {
			// Only recurse into plain objects. Functions and class instances are
			// kept by reference and must not be modified.
			mergeDeep(target[key], value, overwrite);
		} else if (overwrite || !exists || target[key] === undefined) {
			// Copy so later merges into the result don't modify the caller's object
			target[key] = isPlainObject(value)
				? mergeDeep({}, value, overwrite)
				: value;
		}
	}
	return target;
}

function isPlainObject(value: unknown): value is Record<string, any> {
	if (!isObject(value)) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Creates a deep copy of the given object
 */
export function cloneDeep<T>(source: T): T {
	if (isArray(source)) {
		return source.map((i) => cloneDeep(i)) as any;
	} else if (isObject(source)) {
		const target: any = {};
		for (const [key, value] of Object.entries(source)) {
			target[key] = cloneDeep(value);
		}
		return target;
	} else {
		return source;
	}
}

/** Pads a firmware version string, so it can be compared with semver */
export function padVersion(version: string): string {
	if (version.split(".").length === 3) return version;
	return version + ".0";
}

/**
 * Using a binary search, this finds the highest discrete value in [rangeMin...rangeMax] where executor returns true, assuming that
 * increasing the value will at some point cause the executor to return false.
 */
export async function discreteBinarySearch(
	rangeMin: number,
	rangeMax: number,
	executor: (value: number) => boolean | PromiseLike<boolean>,
): Promise<number | undefined> {
	let min = rangeMin;
	let max = rangeMax;
	while (min < max) {
		const mid = min + Math.floor((max - min + 1) / 2);

		const result = await executor(mid);
		if (result) {
			min = mid;
		} else {
			max = mid - 1;
		}
	}

	if (min === rangeMin) {
		// We didn't test this yet
		const result = await executor(min);
		if (!result) return undefined;
	}
	return min;
}

/**
 * Using a linear search, this finds the highest discrete value in [rangeMin...rangeMax] where executor returns true, assuming that
 * increasing the value will at some point cause the executor to return false.
 *
 * When the executor returns `undefined`, the search will be aborted.
 */
export async function discreteLinearSearch(
	rangeMin: number,
	rangeMax: number,
	executor: (
		value: number,
	) => boolean | undefined | PromiseLike<boolean | undefined>,
): Promise<number | undefined> {
	for (let val = rangeMin; val <= rangeMax; val++) {
		const result = await executor(val);

		// Check if the search was aborted
		if (result === undefined) return undefined;

		if (!result) {
			// Found the first value where it no longer returns true
			if (val === rangeMin) {
				// No success at all
				break;
			} else {
				// The previous test was successful
				return val - 1;
			}
		} else {
			if (val === rangeMax) {
				// Everything was successful
				return rangeMax;
			}
		}
	}
}

export function sum(values: number[]): number {
	return values.reduce((acc, cur) => acc + cur, 0);
}

/** Does nothing. Can be used for empty `.catch(...)` calls. */
export function noop(): void {
	// intentionally empty
}

export type FnOrStatic<TArgs extends any[], TReturn> =
	| ((...args: TArgs) => TReturn)
	| TReturn;

export type ReturnTypeOrStatic<T> = T extends (...args: any[]) => infer R
	? R
	: T;

export function evalOrStatic<T>(
	fnOrConst: T,
	...args: any[]
): ReturnTypeOrStatic<T> {
	// @ts-expect-error https://github.com/microsoft/TypeScript/issues/61337
	return typeof fnOrConst === "function" ? fnOrConst(...args) : fnOrConst;
}
