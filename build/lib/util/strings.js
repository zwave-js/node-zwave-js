"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Translates a null-terminated (C++) string to JS */
function cpp2js(str) {
    const nullIndex = str.indexOf("\0");
    if (nullIndex === -1)
        return str;
    return str.substr(0, nullIndex);
}
exports.cpp2js = cpp2js;
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
function stringify(arg) {
    return JSON.stringify(arg, null, 4);
}
exports.stringify = stringify;
