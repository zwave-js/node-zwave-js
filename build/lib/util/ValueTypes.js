"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ZWaveError_1 = require("../error/ZWaveError");
exports.unknownNumber = "unknown";
exports.unknownBoolean = "unknown";
/** Parses a boolean that is encoded as a single byte and might also be "unknown" */
function parseMaybeBoolean(val) {
    return val === 0 ? false :
        val === 0xff ? true :
            val === 0xfe ? exports.unknownBoolean :
                undefined;
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
    return val <= 100 ? val :
        val === 0xff ? 100 :
            val === 0xfe ? exports.unknownNumber :
                undefined;
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
    return { value, scale };
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
