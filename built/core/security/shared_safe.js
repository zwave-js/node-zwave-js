"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidDSK = exports.tryParseDSKFromQRCodeString = void 0;
/**
 * Tries to extract a DSK from a scanned QR code. If the string is a valid DSK (prefixed with "zws2dsk:" or unprefixed), the DSK will be returned.
 * This can then be used to initiate an S2 inclusion with pre-filled DSK.
 */
function tryParseDSKFromQRCodeString(qr) {
    // Trim off whitespace that might have been copied by accident
    qr = qr.trim();
    if (qr.startsWith("zws2dsk:")) {
        qr = qr.slice("zws2dsk:".length);
    }
    if (isValidDSK(qr)) {
        return qr;
    }
}
exports.tryParseDSKFromQRCodeString = tryParseDSKFromQRCodeString;
function isValidDSK(dsk) {
    const patternMatches = /^(\d{5}-){7}\d{5}$/.test(dsk);
    if (!patternMatches)
        return false;
    return dsk
        .split("-")
        .map((p) => parseInt(p, 10))
        .every((p) => p <= 0xffff);
}
exports.isValidDSK = isValidDSK;
//# sourceMappingURL=shared_safe.js.map