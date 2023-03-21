"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sum = exports.discreteLinearSearch = exports.discreteBinarySearch = exports.padVersion = exports.cloneDeep = exports.mergeDeep = exports.throttle = exports.skipBytes = exports.isEnumMember = exports.getEnumMemberName = exports.flatMap = exports.pickDeep = exports.pick = exports.keysOf = void 0;
const typeguards_1 = require("alcalzone-shared/typeguards");
const strings_1 = require("./strings");
/** Object.keys, but with `(keyof T)[]` as the return type */
// eslint-disable-next-line @typescript-eslint/ban-types
function keysOf(obj) {
    return Object.keys(obj);
}
exports.keysOf = keysOf;
/** Returns a subset of `obj` that contains only the given keys */
function pick(obj, keys) {
    const ret = {};
    for (const key of keys) {
        if (key in obj)
            ret[key] = obj[key];
    }
    return ret;
}
exports.pick = pick;
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
function pickDeep(object, path) {
    function _pickDeep(obj, pathArr) {
        // are we there yet? then return obj
        if (!pathArr.length)
            return obj;
        // are we not looking at an object or array? Then bail
        if (!(0, typeguards_1.isObject)(obj) && !(0, typeguards_1.isArray)(obj))
            return undefined;
        // go deeper
        const propName = pathArr.shift();
        return _pickDeep(obj[propName], pathArr);
    }
    return _pickDeep(object, path.split("."));
}
exports.pickDeep = pickDeep;
/** Calls the map function of the given array and flattens the result by one level */
function flatMap(array, callbackfn) {
    const mapped = array.map(callbackfn);
    return mapped.reduce((acc, cur) => [...acc, ...cur], []);
}
exports.flatMap = flatMap;
/**
 * Returns a human-readable representation of the given enum value.
 * If the given value is not found in the enum object, `"unknown (<value-as-hex>)"` is returned.
 *
 * @param enumeration The enumeration object the value comes from
 * @param value The enum value to be pretty-printed
 */
function getEnumMemberName(enumeration, value) {
    return enumeration[value] || `unknown (${(0, strings_1.num2hex)(value)})`;
}
exports.getEnumMemberName = getEnumMemberName;
/**
 * Checks if the given value is a member of the given enum object.
 *
 * @param enumeration The enumeration object the value comes from
 * @param value The enum value to be pretty-printed
 */
function isEnumMember(enumeration, value) {
    return typeof enumeration[value] === "string";
}
exports.isEnumMember = isEnumMember;
/** Skips the first n bytes of a buffer and returns the rest */
function skipBytes(buf, n) {
    return Buffer.from(buf.slice(n));
}
exports.skipBytes = skipBytes;
/**
 * Returns a throttled version of the given function. No matter how often the throttled version is called,
 * the underlying function is only called at maximum every `intervalMs` milliseconds.
 */
function throttle(fn, intervalMs, trailing = false) {
    let lastCall = 0;
    let timeout;
    return (...args) => {
        const now = Date.now();
        if (now >= lastCall + intervalMs) {
            // waited long enough, call now
            lastCall = now;
            fn(...args);
        }
        else if (trailing) {
            if (timeout)
                clearTimeout(timeout);
            const delay = lastCall + intervalMs - now;
            timeout = setTimeout(() => {
                lastCall = now;
                fn(...args);
            }, delay);
        }
    };
}
exports.throttle = throttle;
/**
 * Merges the user-defined options with the default options
 */
function mergeDeep(target, source, overwrite) {
    target = target || {};
    for (const [key, value] of Object.entries(source)) {
        if (key in target) {
            if (value === undefined) {
                // Explicitly delete keys that were set to `undefined`, but only if overwriting is enabled
                if (overwrite)
                    delete target[key];
            }
            else if (typeof value === "object") {
                // merge objects
                target[key] = mergeDeep(target[key], value, overwrite);
            }
            else if (overwrite || typeof target[key] === "undefined") {
                // Only overwrite existing primitives if the overwrite flag is set
                target[key] = value;
            }
        }
        else if (value !== undefined) {
            target[key] = value;
        }
    }
    return target;
}
exports.mergeDeep = mergeDeep;
/**
 * Creates a deep copy of the given object
 */
function cloneDeep(source) {
    if ((0, typeguards_1.isArray)(source)) {
        return source.map((i) => cloneDeep(i));
    }
    else if ((0, typeguards_1.isObject)(source)) {
        const target = {};
        for (const [key, value] of Object.entries(source)) {
            target[key] = cloneDeep(value);
        }
        return target;
    }
    else {
        return source;
    }
}
exports.cloneDeep = cloneDeep;
/** Pads a firmware version string, so it can be compared with semver */
function padVersion(version) {
    if (version.split(".").length === 3)
        return version;
    return version + ".0";
}
exports.padVersion = padVersion;
/**
 * Using a binary search, this finds the highest discrete value in [rangeMin...rangeMax] where executor returns true, assuming that
 * increasing the value will at some point cause the executor to return false.
 */
async function discreteBinarySearch(rangeMin, rangeMax, executor) {
    let min = rangeMin;
    let max = rangeMax;
    while (min < max) {
        const mid = min + Math.floor((max - min + 1) / 2);
        const result = await executor(mid);
        if (result) {
            min = mid;
        }
        else {
            max = mid - 1;
        }
    }
    if (min === rangeMin) {
        // We didn't test this yet
        const result = await executor(min);
        if (!result)
            return undefined;
    }
    return min;
}
exports.discreteBinarySearch = discreteBinarySearch;
/**
 * Using a linear search, this finds the highest discrete value in [rangeMin...rangeMax] where executor returns true, assuming that
 * increasing the value will at some point cause the executor to return false.
 */
async function discreteLinearSearch(rangeMin, rangeMax, executor) {
    for (let val = rangeMin; val <= rangeMax; val++) {
        const result = await executor(val);
        if (!result) {
            // Found the first value where it no longer returns true
            if (val === rangeMin) {
                // No success at all
                break;
            }
            else {
                // The previous test was successful
                return val - 1;
            }
        }
        else {
            if (val === rangeMax) {
                // Everything was successful
                return rangeMax;
            }
        }
    }
}
exports.discreteLinearSearch = discreteLinearSearch;
function sum(values) {
    return values.reduce((acc, cur) => acc + cur, 0);
}
exports.sum = sum;
//# sourceMappingURL=utils.js.map