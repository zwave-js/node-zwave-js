"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodePartial = exports.parsePartial = exports.encodeNodeBitMask = exports.parseNodeBitMask = exports.encodeBitMask = exports.parseBitMask = exports.encodeFloatWithScale = exports.getIntegerLimits = exports.getMinIntegerSize = exports.IntegerLimits = exports.parseFloatWithScale = exports.parseNumber = exports.parseMaybeNumber = exports.encodeMaybeBoolean = exports.encodeBoolean = exports.parseBoolean = exports.parseMaybeBoolean = exports.unknownBoolean = exports.unknownNumber = void 0;
const consts_1 = require("../consts");
const ZWaveError_1 = require("../error/ZWaveError");
const misc_1 = require("../util/misc");
exports.unknownNumber = "unknown";
exports.unknownBoolean = "unknown";
/** Parses a boolean that is encoded as a single byte and might also be "unknown" */
function parseMaybeBoolean(val, preserveUnknown = true) {
    return val === 0xfe
        ? preserveUnknown
            ? exports.unknownBoolean
            : undefined
        : parseBoolean(val);
}
exports.parseMaybeBoolean = parseMaybeBoolean;
/** Parses a boolean that is encoded as a single byte */
function parseBoolean(val) {
    return val === 0 ? false : val === 0xff ? true : undefined;
}
exports.parseBoolean = parseBoolean;
/** Encodes a boolean that is encoded as a single byte */
function encodeBoolean(val) {
    return val ? 0xff : 0;
}
exports.encodeBoolean = encodeBoolean;
/** Encodes a boolean that is encoded as a single byte and might also be "unknown" */
function encodeMaybeBoolean(val) {
    return val === "unknown" ? 0xfe : val ? 0xff : 0;
}
exports.encodeMaybeBoolean = encodeMaybeBoolean;
/** Parses a single-byte number from 0 to 99, which might also be "unknown" */
function parseMaybeNumber(val) {
    return val === 0xfe ? exports.unknownNumber : parseNumber(val);
}
exports.parseMaybeNumber = parseMaybeNumber;
/** Parses a single-byte number from 0 to 99 */
function parseNumber(val) {
    return val <= 99 ? val : val === 0xff ? 99 : undefined;
}
exports.parseNumber = parseNumber;
/**
 * Parses a floating point value with a scale from a buffer.
 * @param allowEmpty Whether empty floats (precision = scale = size = 0 no value) are accepted
 */
function parseFloatWithScale(payload, allowEmpty = false) {
    (0, misc_1.validatePayload)(payload.length >= 1);
    const precision = (payload[0] & 224) >>> 5;
    const scale = (payload[0] & 24) >>> 3;
    const size = payload[0] & 0b111;
    if (allowEmpty && size === 0) {
        (0, misc_1.validatePayload)(precision === 0, scale === 0);
        return { bytesRead: 1 };
    }
    else {
        (0, misc_1.validatePayload)(size >= 1, size <= 4, payload.length >= 1 + size);
        const value = payload.readIntBE(1, size) / Math.pow(10, precision);
        return { value, scale, bytesRead: 1 + size };
    }
}
exports.parseFloatWithScale = parseFloatWithScale;
function getPrecision(num) {
    if (!Number.isFinite(num))
        return 0;
    let e = 1;
    let p = 0;
    while (Math.round(num * e) / e !== num) {
        e *= 10;
        p++;
    }
    return p;
}
/** The minimum and maximum values that can be stored in each numeric value type */
exports.IntegerLimits = Object.freeze({
    UInt8: Object.freeze({ min: 0, max: 0xff }),
    UInt16: Object.freeze({ min: 0, max: 0xffff }),
    UInt24: Object.freeze({ min: 0, max: 0xffffff }),
    UInt32: Object.freeze({ min: 0, max: 0xffffffff }),
    Int8: Object.freeze({ min: -0x80, max: 0x7f }),
    Int16: Object.freeze({ min: -0x8000, max: 0x7fff }),
    Int24: Object.freeze({ min: -0x800000, max: 0x7fffff }),
    Int32: Object.freeze({ min: -0x80000000, max: 0x7fffffff }),
});
function getMinIntegerSize(value, signed) {
    if (signed) {
        if (value >= exports.IntegerLimits.Int8.min && value <= exports.IntegerLimits.Int8.max)
            return 1;
        else if (value >= exports.IntegerLimits.Int16.min &&
            value <= exports.IntegerLimits.Int16.max)
            return 2;
        else if (value >= exports.IntegerLimits.Int32.min &&
            value <= exports.IntegerLimits.Int32.max)
            return 4;
    }
    else if (value >= 0) {
        if (value <= exports.IntegerLimits.UInt8.max)
            return 1;
        if (value <= exports.IntegerLimits.UInt16.max)
            return 2;
        if (value <= exports.IntegerLimits.UInt32.max)
            return 4;
    }
    // Not a valid size
}
exports.getMinIntegerSize = getMinIntegerSize;
function getIntegerLimits(size, signed) {
    return exports.IntegerLimits[`${signed ? "" : "U"}Int${size * 8}`];
}
exports.getIntegerLimits = getIntegerLimits;
/**
 * Encodes a floating point value with a scale into a buffer
 * @param override can be used to overwrite the automatic computation of precision and size with fixed values
 */
function encodeFloatWithScale(value, scale, override = {}) {
    const precision = override.precision ?? Math.min(getPrecision(value), 7);
    value = Math.round(value * Math.pow(10, precision));
    let size = getMinIntegerSize(value, true);
    if (size == undefined) {
        throw new ZWaveError_1.ZWaveError(`Cannot encode the value ${value} because its too large or too small to fit into 4 bytes`, ZWaveError_1.ZWaveErrorCodes.Arithmetic);
    }
    else if (override.size != undefined && override.size > size) {
        size = override.size;
    }
    const ret = Buffer.allocUnsafe(1 + size);
    ret[0] =
        ((precision & 0b111) << 5) | ((scale & 0b11) << 3) | (size & 0b111);
    ret.writeIntBE(value, 1, size);
    return ret;
}
exports.encodeFloatWithScale = encodeFloatWithScale;
/** Parses a bit mask into a numeric array */
function parseBitMask(mask, startValue = 1) {
    const numBits = mask.length * 8;
    const ret = [];
    for (let index = 1; index <= numBits; index++) {
        const byteNum = (index - 1) >>> 3; // id / 8
        const bitNum = (index - 1) % 8;
        if ((mask[byteNum] & (2 ** bitNum)) !== 0)
            ret.push(index + startValue - 1);
    }
    return ret;
}
exports.parseBitMask = parseBitMask;
/** Serializes a numeric array with a given maximum into a bit mask */
function encodeBitMask(values, maxValue, startValue = 1) {
    const numBytes = Math.ceil((maxValue - startValue + 1) / 8);
    const ret = Buffer.alloc(numBytes, 0);
    for (let val = startValue; val <= maxValue; val++) {
        if (values.indexOf(val) === -1)
            continue;
        const byteNum = (val - startValue) >>> 3; // id / 8
        const bitNum = (val - startValue) % 8;
        ret[byteNum] |= 2 ** bitNum;
    }
    return ret;
}
exports.encodeBitMask = encodeBitMask;
function parseNodeBitMask(mask) {
    return parseBitMask(mask.slice(0, consts_1.NUM_NODEMASK_BYTES));
}
exports.parseNodeBitMask = parseNodeBitMask;
function encodeNodeBitMask(nodeIDs) {
    return encodeBitMask(nodeIDs, consts_1.NUM_NODEMASK_BYTES);
}
exports.encodeNodeBitMask = encodeNodeBitMask;
/**
 * Parses a partial value from a "full" value. Example:
 * ```txt
 *   Value = 01110000
 *   Mask  = 00110000
 *   ----------------
 *             11     => 3 (unsigned) or -1 (signed)
 * ```
 *
 * @param value The full value the partial should be extracted from
 * @param bitMask The bit mask selecting the partial value
 * @param signed Whether the partial value should be interpreted as signed
 */
function parsePartial(value, bitMask, signed) {
    const shift = (0, misc_1.getMinimumShiftForBitMask)(bitMask);
    const width = (0, misc_1.getBitMaskWidth)(bitMask);
    let ret = (value & bitMask) >>> shift;
    // If the high bit is set and this value should be signed, we need to convert it
    if (signed && !!(ret & (2 ** (width - 1)))) {
        // To represent a negative partial as signed, the high bits must be set to 1
        ret = ~(~ret & (bitMask >>> shift));
    }
    return ret;
}
exports.parsePartial = parsePartial;
/**
 * Encodes a partial value into a "full" value. Example:
 * ```txt
 *   Value   = 01··0000
 * + Partial =   10     (2 or -2 depending on signed interpretation)
 *   Mask    = 00110000
 *   ------------------
 *             01100000
 * ```
 *
 * @param fullValue The full value the partial should be merged into
 * @param partialValue The partial to be merged
 * @param bitMask The bit mask selecting the partial value
 */
function encodePartial(fullValue, partialValue, bitMask) {
    const ret = (fullValue & ~bitMask) |
        ((partialValue << (0, misc_1.getMinimumShiftForBitMask)(bitMask)) & bitMask);
    return ret >>> 0; // convert to unsigned if necessary
}
exports.encodePartial = encodePartial;
//# sourceMappingURL=Primitive.js.map