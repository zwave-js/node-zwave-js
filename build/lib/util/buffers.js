"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function writeUInt24BE(target, value, offset = 0) {
    for (let bytes = 2; bytes >= 0; bytes--) {
        target[offset + bytes] = value & 0xff;
        value >>>= 8;
    }
}
exports.writeUInt24BE = writeUInt24BE;
function readUInt24BE(source, offset = 0) {
    let ret = 0;
    for (let bytes = 0; bytes <= 2; bytes++) {
        ret <<= 8;
        ret += source[offset + bytes];
    }
    return ret;
}
exports.readUInt24BE = readUInt24BE;
