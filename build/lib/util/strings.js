"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Pads a string to the given length by repeatedly prepending the filler at the beginning of the string.
 * @param str The string to pad
 * @param targetLen The target length
 * @param fill The filler string to prepend. Depending on the lenght requirements, this might get truncated.
 */
function padStart(str, targetLen, fill = " ") {
    // simply return strings that are long enough to not be padded
    if (str != null && str.length >= targetLen)
        return str;
    // make sure that <fill> isn't empty
    if (fill == null || fill.length < 1)
        throw new Error("fill must be at least one char");
    // figure out how often we need to repeat <fill>
    const missingLength = targetLen - str.length;
    const repeats = Math.ceil(missingLength / fill.length);
    return fill.repeat(repeats).substr(0, missingLength) + str;
}
exports.padStart = padStart;
/** Translates a null-terminated (C++) string to JS */
function cpp2js(str) {
    const nullIndex = str.indexOf("\0");
    if (nullIndex === -1)
        return str;
    return str.substr(0, nullIndex);
}
exports.cpp2js = cpp2js;
