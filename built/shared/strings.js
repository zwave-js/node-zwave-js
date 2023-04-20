"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = exports.formatTime = exports.compareStrings = exports.isPrintableASCIIWithNewlines = exports.isPrintableASCII = exports.buffer2hex = exports.stringify = exports.formatId = exports.num2hex = exports.cpp2js = void 0;
const strings_1 = require("alcalzone-shared/strings");
/** Translates a null-terminated (C++) string to JS */
function cpp2js(str) {
    const nullIndex = str.indexOf("\0");
    if (nullIndex === -1)
        return str;
    return str.substr(0, nullIndex);
}
exports.cpp2js = cpp2js;
/**
 * Formats a number as a hexadecimal string, while making sure that the length is a multiple of two digits.
 * `undefined` and `null` get converted to `"undefined"`.
 *
 * @param val The value to be formatted as hexadecimal
 * @param uppercase Whether uppercase letters should be used
 */
function num2hex(val, uppercase = false) {
    if (val == null)
        return "undefined";
    let ret = val.toString(16);
    if (uppercase)
        ret = ret.toUpperCase();
    if (ret.length % 2 !== 0)
        ret = "0" + ret;
    return "0x" + ret;
}
exports.num2hex = num2hex;
/**
 * Formats an ID as a 4-digit lowercase hexadecimal string, to guarantee a representation that matches the Z-Wave specs.
 * This is meant to be used to display manufacturer ID, product type and product ID, etc.
 */
function formatId(id) {
    id = typeof id === "number" ? id.toString(16) : id;
    return "0x" + (0, strings_1.padStart)(id, 4, "0").toLowerCase();
}
exports.formatId = formatId;
function stringify(arg, space = 4) {
    return JSON.stringify(arg, null, space);
}
exports.stringify = stringify;
/**
 * Formats a buffer as an hexadecimal string, with an even number of digits.
 * Returns `"(empty)"` if the buffer is empty.
 *
 * @param buffer The value to be formatted as hexadecimal
 * @param uppercase Whether uppercase letters should be used
 */
function buffer2hex(buffer, uppercase = false) {
    if (buffer.length === 0)
        return "(empty)";
    let ret = buffer.toString("hex");
    if (uppercase)
        ret = ret.toUpperCase();
    return "0x" + ret;
}
exports.buffer2hex = buffer2hex;
function isPrintableASCII(text) {
    return /^[\u0020-\u007e]*$/.test(text);
}
exports.isPrintableASCII = isPrintableASCII;
function isPrintableASCIIWithNewlines(text) {
    text = text.replace(/^[\r\n]*/g, "").replace(/[\r\n]*/g, "");
    return isPrintableASCII(text);
}
exports.isPrintableASCIIWithNewlines = isPrintableASCIIWithNewlines;
function compareStrings(a, b) {
    if (a > b)
        return 1;
    if (b > a)
        return -1;
    return 0;
}
exports.compareStrings = compareStrings;
function formatTime(hour, minute) {
    return `${(0, strings_1.padStart)(hour.toString(), 2, "0")}:${(0, strings_1.padStart)(minute.toString(), 2, "0")}`;
}
exports.formatTime = formatTime;
function formatDate(year, month, day) {
    return `${(0, strings_1.padStart)(year.toString(), 4, "0")}-${(0, strings_1.padStart)(month.toString(), 2, "0")}-${(0, strings_1.padStart)(day.toString(), 2, "0")}`;
}
exports.formatDate = formatDate;
//# sourceMappingURL=strings.js.map