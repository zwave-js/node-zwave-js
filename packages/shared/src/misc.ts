import { num2hex } from "./strings";

/** Object.keys, but with `(keyof T)[]` as the return type */
export function keysOf<T>(obj: T): (keyof T)[] {
	return Object.keys(obj) as unknown as (keyof T)[];
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
				lastCall = now;
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
): Record<string, any> {
	target = target || {};
	for (const [key, value] of Object.entries(source)) {
		if (!(key in target)) {
			target[key] = value;
		} else {
			if (typeof value === "object") {
				// merge objects
				target[key] = mergeDeep(target[key], value);
			} else if (typeof target[key] === "undefined") {
				// don't override single keys
				target[key] = value;
			}
		}
	}
	return target;
}

/** Pads a firmware version string, so it can be compared with semver */
export function padVersion(version: string): string {
	if (version.split(".").length === 3) return version;
	return version + ".0";
}

/** Finds the highest discrete value in [rangeMin...rangeMax] where executor returns true. */
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
