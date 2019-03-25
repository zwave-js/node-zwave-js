"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unknownNumber = "unknown";
exports.unknownBoolean = "unknown";
function parseMaybeBoolean(val) {
    return val === 0 ? false :
        val === 0xff ? true :
            val === 0xfe ? exports.unknownBoolean :
                undefined;
}
exports.parseMaybeBoolean = parseMaybeBoolean;
function parseBoolean(val) {
    return val === 0 ? false :
        val === 0xff ? true :
            undefined;
}
exports.parseBoolean = parseBoolean;
function parseMaybeNumber(val) {
    return val <= 100 ? val :
        val === 0xff ? 100 :
            val === 0xfe ? exports.unknownNumber :
                undefined;
}
exports.parseMaybeNumber = parseMaybeNumber;
function parseNumber(val) {
    return val <= 100 ? val :
        val === 0xff ? 100 :
            undefined;
}
exports.parseNumber = parseNumber;
