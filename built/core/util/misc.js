"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLegalRangeForBitMask = exports.getBitMaskWidth = exports.getMinimumShiftForBitMask = exports.validatePayload = exports.stripUndefined = exports.isConsecutiveArray = void 0;
const ZWaveError_1 = require("../error/ZWaveError");
/** Ensures that the values array is consecutive */
function isConsecutiveArray(values) {
    return values.every((v, i, arr) => (i === 0 ? true : v - 1 === arr[i - 1]));
}
exports.isConsecutiveArray = isConsecutiveArray;
/** Returns an object that includes all non-undefined properties from the original one */
function stripUndefined(obj) {
    const ret = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined)
            ret[key] = value;
    }
    return ret;
}
exports.stripUndefined = stripUndefined;
function validatePayloadInternal(reason, ...assertions) {
    if (!assertions.every(Boolean)) {
        throw new ZWaveError_1.ZWaveError("The message payload is invalid!", ZWaveError_1.ZWaveErrorCodes.PacketFormat_InvalidPayload, reason);
    }
}
// Export and augment the validatePayload method with a reason
exports.validatePayload = validatePayloadInternal.bind(undefined, undefined);
exports.validatePayload.withReason = (reason) => validatePayloadInternal.bind(undefined, reason);
exports.validatePayload.fail = (reason) => exports.validatePayload.withReason(reason)(false);
/**
 * Determines how many bits a value must be shifted to be right-aligned with a given bit mask
 * Example:
 * ```txt
 *   Mask = 00110000
 *             ^---- => 4 bits
 *
 *   Mask = 00110001
 *                 ^ => 0 bits
 * ```
 */
function getMinimumShiftForBitMask(mask) {
    let i = 0;
    while (mask % 2 === 0) {
        mask >>>= 1;
        if (mask === 0)
            break;
        i++;
    }
    return i;
}
exports.getMinimumShiftForBitMask = getMinimumShiftForBitMask;
/**
 * Determines how many wide a given bit mask is
 * Example:
 * ```txt
 *   Mask = 00110000
 *            ^^---- => 2 bits
 *
 *   Mask = 00110001
 *            ^....^ => 6 bits
 * ```
 */
function getBitMaskWidth(mask) {
    mask = mask >>> getMinimumShiftForBitMask(mask);
    let i = 0;
    while (mask > 0) {
        mask >>>= 1;
        i++;
    }
    return i;
}
exports.getBitMaskWidth = getBitMaskWidth;
/**
 * Determines the legal range of values that can be encoded at with the given bit mask
 * Example:
 * ```txt
 *   Mask = 00110000
 *            ^^---- => 0..3 unsigned OR -2..+1 signed
 *
 *   Mask = 00110001
 *            ^....^ => 0..63 unsigned OR -32..+31 signed (with gaps)
 * ```
 */
function getLegalRangeForBitMask(mask, unsigned) {
    if (mask === 0)
        return [0, 0];
    const bitMaskWidth = getBitMaskWidth(mask);
    const min = unsigned || bitMaskWidth == 1 ? 0 : -(2 ** (bitMaskWidth - 1));
    const max = unsigned || bitMaskWidth == 1
        ? 2 ** bitMaskWidth - 1
        : 2 ** (bitMaskWidth - 1) - 1;
    return [min, max];
}
exports.getLegalRangeForBitMask = getLegalRangeForBitMask;
//# sourceMappingURL=misc.js.map