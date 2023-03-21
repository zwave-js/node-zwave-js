"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQRCodeString = exports.ProvisioningInformationType = exports.QRCodeVersion = void 0;
const crypto_1 = require("crypto");
const Protocols_1 = require("../capabilities/Protocols");
const ZWaveError_1 = require("../error/ZWaveError");
const Primitive_1 = require("../values/Primitive");
const DSK_1 = require("./DSK");
const SecurityClass_1 = require("./SecurityClass");
function readNumber(qr, offset, length) {
    return parseInt(qr.substr(offset, length), 10);
}
function fail(reason) {
    throw new ZWaveError_1.ZWaveError(`Invalid QR code: ${reason}`, ZWaveError_1.ZWaveErrorCodes.Security2CC_InvalidQRCode);
}
/** Reads a number between 0 and 99 (2 decimal digits) */
function readLevel(qr, offset) {
    const ret = readNumber(qr, offset, 2);
    if (ret > 99)
        fail("invalid data");
    return ret;
}
/** Reads a byte (3 decimal digits) */
function readUInt8(qr, offset) {
    const ret = readNumber(qr, offset, 3);
    if (ret > 0xff)
        fail("invalid data");
    return ret;
}
/** Reads a 2-byte value (5 decimal digits) */
function readUInt16(qr, offset) {
    const ret = readNumber(qr, offset, 5);
    if (ret > 0xffff)
        fail("invalid data");
    return ret;
}
const onlyDigitsRegex = /^\d+$/;
const minQRCodeLength = 52; // 2 digits Z, 2 digits version, 5 digits checksum, 3 digits keys, 40 digits DSK
var QRCodeVersion;
(function (QRCodeVersion) {
    QRCodeVersion[QRCodeVersion["S2"] = 0] = "S2";
    QRCodeVersion[QRCodeVersion["SmartStart"] = 1] = "SmartStart";
})(QRCodeVersion = exports.QRCodeVersion || (exports.QRCodeVersion = {}));
var ProvisioningInformationType;
(function (ProvisioningInformationType) {
    ProvisioningInformationType[ProvisioningInformationType["ProductType"] = 0] = "ProductType";
    ProvisioningInformationType[ProvisioningInformationType["ProductId"] = 1] = "ProductId";
    ProvisioningInformationType[ProvisioningInformationType["MaxInclusionRequestInterval"] = 2] = "MaxInclusionRequestInterval";
    ProvisioningInformationType[ProvisioningInformationType["UUID16"] = 3] = "UUID16";
    ProvisioningInformationType[ProvisioningInformationType["SupportedProtocols"] = 4] = "SupportedProtocols";
    // The ones below are NOT QR code compatible and therefore not implemented here
    ProvisioningInformationType[ProvisioningInformationType["Name"] = 50] = "Name";
    ProvisioningInformationType[ProvisioningInformationType["Location"] = 51] = "Location";
    ProvisioningInformationType[ProvisioningInformationType["SmartStartInclusionSetting"] = 52] = "SmartStartInclusionSetting";
    ProvisioningInformationType[ProvisioningInformationType["AdvancedJoining"] = 53] = "AdvancedJoining";
    ProvisioningInformationType[ProvisioningInformationType["BootstrappingMode"] = 54] = "BootstrappingMode";
    ProvisioningInformationType[ProvisioningInformationType["NetworkStatus"] = 55] = "NetworkStatus";
})(ProvisioningInformationType = exports.ProvisioningInformationType || (exports.ProvisioningInformationType = {}));
function parseTLVData(type, data) {
    switch (type) {
        case ProvisioningInformationType.ProductType: {
            const deviceClasses = readUInt16(data, 0);
            const installerIconType = readUInt16(data, 5);
            const ret = {
                genericDeviceClass: deviceClasses >>> 8,
                specificDeviceClass: deviceClasses & 0xff,
                installerIconType,
            };
            return ret;
        }
        case ProvisioningInformationType.ProductId: {
            const manufacturerId = readUInt16(data, 0);
            const productType = readUInt16(data, 5);
            const productId = readUInt16(data, 10);
            const applicationVersionNumeric = readUInt16(data, 15);
            const applicationVersion = `${applicationVersionNumeric >>> 8}.${applicationVersionNumeric & 0xff}`;
            const ret = {
                manufacturerId,
                productType,
                productId,
                applicationVersion,
            };
            return ret;
        }
        case ProvisioningInformationType.MaxInclusionRequestInterval: {
            const maxInclusionRequestInterval = 128 * readLevel(data, 0);
            const ret = {
                maxInclusionRequestInterval,
            };
            return ret;
        }
        case ProvisioningInformationType.UUID16: {
            const buffer = Buffer.allocUnsafe(16);
            // Only format 0 is supported here
            const presentationFormat = readLevel(data, 0);
            if (presentationFormat !== 0)
                return;
            for (let chunk = 0; chunk < 8; chunk++) {
                const value = readUInt16(data, 2 + chunk * 5);
                buffer.writeUInt16BE(value, chunk * 2);
            }
            const ret = {
                uuid: buffer.toString("hex"),
            };
            return ret;
        }
        case ProvisioningInformationType.SupportedProtocols: {
            const bitMask = Buffer.from([
                data.length === 2
                    ? readLevel(data, 0)
                    : data.length === 3
                        ? readUInt8(data, 0)
                        : data.length === 5
                            ? readUInt16(data, 0)
                            : 0,
            ]);
            const supportedProtocols = (0, Primitive_1.parseBitMask)(bitMask, Protocols_1.Protocols.ZWave);
            const ret = {
                supportedProtocols,
            };
            return ret;
        }
    }
}
function parseTLV(qr) {
    let offset = 0;
    if (qr.length - offset < 4)
        fail("incomplete TLV block");
    const typeCritical = readLevel(qr, offset);
    const type = typeCritical >>> 1;
    const critical = !!(typeCritical & 0b1);
    const length = readLevel(qr, offset + 2);
    offset += 4;
    if (qr.length - offset < length)
        fail("incomplete TLV block");
    const data = qr.substr(offset, length);
    offset += length;
    // Try to parse the raw data and fail if a critical block is not understood
    const parsed = parseTLVData(type, data);
    if (!parsed && critical)
        fail("Unsupported critical TLV block");
    let entry;
    if (parsed) {
        entry = {
            type,
            ...parsed,
        };
    }
    else {
        entry = {
            type,
            [ProvisioningInformationType[type]]: data,
        };
    }
    return {
        entry,
        charsRead: offset,
    };
}
/** Parses a string that has been decoded from a Z-Wave (S2 or SmartStart) QR code */
function parseQRCodeString(qr) {
    // Trim off whitespace that might have been copied by accident
    qr = qr.trim();
    // Validate the QR code
    if (!qr.startsWith("90"))
        fail("must start with 90");
    if (qr.length < minQRCodeLength)
        fail("too short");
    if (!onlyDigitsRegex.test(qr))
        fail("contains invalid characters");
    const version = readLevel(qr, 2);
    if (version > QRCodeVersion.SmartStart)
        fail("invalid version");
    const checksum = readUInt16(qr, 4);
    // The checksum covers the remaining data
    const hash = (0, crypto_1.createHash)("sha1");
    hash.update(Buffer.from(qr.slice(9), "ascii"));
    const expectedChecksum = hash.digest().readUInt16BE(0);
    if (checksum !== expectedChecksum)
        fail("invalid checksum");
    const requestedKeysBitmask = readUInt8(qr, 9);
    const requestedSecurityClasses = (0, Primitive_1.parseBitMask)(Buffer.from([requestedKeysBitmask]), SecurityClass_1.SecurityClass.S2_Unauthenticated);
    if (!requestedSecurityClasses.every((k) => k in SecurityClass_1.SecurityClass)) {
        fail("invalid security class requested");
    }
    let offset = 12;
    const dsk = Buffer.allocUnsafe(16);
    for (let dskBlock = 0; dskBlock < 8; dskBlock++) {
        const block = readUInt16(qr, offset);
        dsk.writeUInt16BE(block, dskBlock * 2);
        offset += 5;
    }
    const ret = {
        version,
        // This seems like a duplication, but it's more convenient for applications to not have to copy this field over
        requestedSecurityClasses,
        securityClasses: [...requestedSecurityClasses],
        dsk: (0, DSK_1.dskToString)(dsk),
    };
    let hasProductID = false;
    let hasProductType = false;
    while (offset < qr.length) {
        const { entry: { type, ...data }, charsRead, } = parseTLV(qr.slice(offset));
        offset += charsRead;
        if (type === ProvisioningInformationType.ProductId) {
            hasProductID = true;
        }
        else if (type === ProvisioningInformationType.ProductType) {
            hasProductType = true;
        }
        Object.assign(ret, data);
    }
    // Ensure the required fields are present
    if (!hasProductID || !hasProductType) {
        fail("missing required fields");
    }
    return ret;
}
exports.parseQRCodeString = parseQRCodeString;
//# sourceMappingURL=QR.js.map