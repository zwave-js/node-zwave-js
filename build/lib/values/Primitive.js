"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ZWaveError_1 = require("../error/ZWaveError");
exports.unknownNumber = "unknown";
exports.unknownBoolean = "unknown";
/** Parses a boolean that is encoded as a single byte and might also be "unknown" */
function parseMaybeBoolean(val) {
    return val === 0xfe ? exports.unknownBoolean : parseBoolean(val);
}
exports.parseMaybeBoolean = parseMaybeBoolean;
/** Parses a boolean that is encoded as a single byte */
function parseBoolean(val) {
    return val === 0 ? false :
        val === 0xff ? true :
            undefined;
}
exports.parseBoolean = parseBoolean;
/** Parses a single-byte number from 0 to 100, which might also be "unknown" */
function parseMaybeNumber(val) {
    return val === 0xfe ? exports.unknownNumber : parseNumber(val);
}
exports.parseMaybeNumber = parseMaybeNumber;
/** Parses a single-byte number from 0 to 100 */
function parseNumber(val) {
    return val <= 100 ? val :
        val === 0xff ? 100 :
            undefined;
}
exports.parseNumber = parseNumber;
/** Parses a floating point value with a scale from a buffer */
function parseFloatWithScale(payload) {
    const precision = (payload[0] & 224) >>> 5;
    const scale = (payload[0] & 24) >>> 3;
    const size = payload[0] & 0b111;
    const value = payload.readIntBE(1, size) / Math.pow(10, precision);
    return { value, scale, bytesRead: 1 + size };
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
/** Encodes a floating point value with a scale into a buffer */
function encodeFloatWithScale(value, scale) {
    const precision = Math.min(getPrecision(value), 7);
    value = Math.round(value * Math.pow(10, precision));
    let size;
    if (value >= -128 && value <= 127)
        size = 1;
    else if (value >= -32768 && value <= 32767)
        size = 2;
    else if (value >= -2147483648 && value <= 2147483647)
        size = 4;
    else {
        throw new ZWaveError_1.ZWaveError(`Cannot encode the value ${value} because its too large or too small to fit into 4 bytes`, ZWaveError_1.ZWaveErrorCodes.Arithmetic);
    }
    const ret = Buffer.allocUnsafe(1 + size);
    ret[0] = ((precision & 0b111) << 5) | ((scale & 0b11) << 3) | (size & 0b111);
    ret.writeIntBE(value, 1, size);
    return ret;
}
exports.encodeFloatWithScale = encodeFloatWithScale;
/** Parses a bit mask into a numeric array */
function parseBitMask(mask) {
    const numBits = mask.length * 8;
    const ret = [];
    for (let index = 1; index <= numBits; index++) {
        const byteNum = (index - 1) >>> 3; // id / 8
        const bitNum = (index - 1) % 8;
        if ((mask[byteNum] & (1 << bitNum)) !== 0)
            ret.push(index);
    }
    return ret;
}
exports.parseBitMask = parseBitMask;
/** Serializes a numeric array with a given maximum into a bit mask */
function encodeBitMask(values, maxValue) {
    const numBytes = Math.ceil(maxValue / 8);
    const ret = Buffer.alloc(numBytes, 0);
    for (let val = 1; val <= maxValue; val++) {
        if (values.indexOf(val) === -1)
            continue;
        const byteNum = (val - 1) >>> 3; // id / 8
        const bitNum = (val - 1) % 8;
        ret[byteNum] |= (1 << bitNum);
    }
    return ret;
}
exports.encodeBitMask = encodeBitMask;
