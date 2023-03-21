/// <reference types="node" />
/** Object.keys, but with `(keyof T)[]` as the return type */
export declare function keysOf<T extends {}>(obj: T): (keyof T)[];
/** Returns a subset of `obj` that contains only the given keys */
export declare function pick<T extends Record<any, any>, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K>;
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
export declare function pickDeep<T = unknown>(object: Record<string, any>, path: string): T;
/** Calls the map function of the given array and flattens the result by one level */
export declare function flatMap<U, T extends any[]>(array: T[], callbackfn: (value: T, index: number, array: T[]) => U[]): U[];
/**
 * Returns a human-readable representation of the given enum value.
 * If the given value is not found in the enum object, `"unknown (<value-as-hex>)"` is returned.
 *
 * @param enumeration The enumeration object the value comes from
 * @param value The enum value to be pretty-printed
 */
export declare function getEnumMemberName(enumeration: unknown, value: number): string;
/**
 * Checks if the given value is a member of the given enum object.
 *
 * @param enumeration The enumeration object the value comes from
 * @param value The enum value to be pretty-printed
 */
export declare function isEnumMember(enumeration: unknown, value: number): boolean;
/** Skips the first n bytes of a buffer and returns the rest */
export declare function skipBytes(buf: Buffer, n: number): Buffer;
/**
 * Returns a throttled version of the given function. No matter how often the throttled version is called,
 * the underlying function is only called at maximum every `intervalMs` milliseconds.
 */
export declare function throttle<T extends any[]>(fn: (...args: T) => void, intervalMs: number, trailing?: boolean): (...args: T) => void;
/**
 * Merges the user-defined options with the default options
 */
export declare function mergeDeep(target: Record<string, any> | undefined, source: Record<string, any>, overwrite?: boolean): Record<string, any>;
/**
 * Creates a deep copy of the given object
 */
export declare function cloneDeep<T>(source: T): T;
/** Pads a firmware version string, so it can be compared with semver */
export declare function padVersion(version: string): string;
/**
 * Using a binary search, this finds the highest discrete value in [rangeMin...rangeMax] where executor returns true, assuming that
 * increasing the value will at some point cause the executor to return false.
 */
export declare function discreteBinarySearch(rangeMin: number, rangeMax: number, executor: (value: number) => boolean | PromiseLike<boolean>): Promise<number | undefined>;
/**
 * Using a linear search, this finds the highest discrete value in [rangeMin...rangeMax] where executor returns true, assuming that
 * increasing the value will at some point cause the executor to return false.
 */
export declare function discreteLinearSearch(rangeMin: number, rangeMax: number, executor: (value: number) => boolean | PromiseLike<boolean>): Promise<number | undefined>;
export declare function sum(values: number[]): number;
//# sourceMappingURL=utils.d.ts.map