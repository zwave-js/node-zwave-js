"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFirmware = exports.guessFirmwareFileFormat = void 0;
const shared_1 = require("@zwave-js/shared");
const crypto = __importStar(require("crypto"));
// @ts-expect-error There are no type definitions for nrf-intel-hex
const nrf_intel_hex_1 = __importDefault(require("nrf-intel-hex"));
const ZWaveError_1 = require("../error/ZWaveError");
const crc_1 = require("./crc");
const firmwareIndicators = {
    // All aeotec updater exes contain this text
    aeotec: Buffer.from("Zensys.ZWave", "utf8"),
    // This seems to be the standard beginning of a gecko bootloader firmware
    gecko: 0xeb17a603,
    // Encrypted HEC firmware files
    hec: Buffer.from("HSENC2", "ascii"),
};
/**
 * Guess the firmware format based on filename and firmware buffer
 *
 * @param filename The firmware filename
 * @param rawData A buffer containing the original firmware update file
 */
function guessFirmwareFileFormat(filename, rawData) {
    if (filename.endsWith(".bin")) {
        return "bin";
    }
    else if ((filename.endsWith(".exe") || filename.endsWith(".ex_")) &&
        rawData.includes(firmwareIndicators.aeotec)) {
        return "aeotec";
    }
    else if (/\.(hex|ota|otz)$/.test(filename)) {
        return filename.slice(-3);
    }
    else if (filename.endsWith(".gbl") &&
        rawData.readUInt32BE(0) === firmwareIndicators.gecko) {
        return "gecko";
    }
    else if (filename.endsWith(".hec") &&
        rawData
            .slice(0, firmwareIndicators.hec.length)
            .equals(firmwareIndicators.hec)) {
        return "hec";
    }
    else {
        throw new ZWaveError_1.ZWaveError("Could not detect firmware format", ZWaveError_1.ZWaveErrorCodes.Invalid_Firmware_File);
    }
}
exports.guessFirmwareFileFormat = guessFirmwareFileFormat;
/**
 * Extracts the firmware data from a file. The following formats are available:
 * - `"aeotec"` - A Windows executable (.exe or .ex_) that contains Aeotec's upload tool
 * - `"otz"` - A compressed firmware file in Intel HEX format
 * - `"ota"` or `"hex"` - An uncompressed firmware file in Intel HEX format
 * - `"hec"` - An encrypted Intel HEX firmware file
 * - `"gecko"` - A binary gecko bootloader firmware file with `.gbl` extension
 *
 * The returned firmware data and target can be used to start a firmware update process with `node.beginFirmwareUpdate`
 */
function extractFirmware(rawData, format) {
    switch (format) {
        case "aeotec":
            return extractFirmwareAeotec(rawData);
        case "otz":
        case "ota":
            // Per convention, otz and ota files SHOULD be in Intel HEX format,
            // but some manufacturers use them for binary data. So we attempt parsing
            // them as HEX and fall back to returning the binary contents.
            if (rawData.every((b) => b <= 127)) {
                try {
                    return extractFirmwareHEX(rawData);
                }
                catch (e) {
                    if (e instanceof ZWaveError_1.ZWaveError &&
                        e.code === ZWaveError_1.ZWaveErrorCodes.Argument_Invalid) {
                        // Fall back to binary data
                    }
                    else {
                        throw e;
                    }
                }
            }
            return extractFirmwareRAW(rawData);
        case "hex":
            return extractFirmwareHEX(rawData);
        case "hec":
            return extractFirmwareHEC(rawData);
        case "gecko":
            // There is no description for the file contents, so we
            // have to assume this is for firmware target 0
            return extractFirmwareRAW(rawData);
        case "bin":
            // There is no description for the file contents, so the user has to make sure to select the correct target
            return extractFirmwareRAW(rawData);
    }
}
exports.extractFirmware = extractFirmware;
function extractFirmwareRAW(data) {
    return { data };
}
function extractFirmwareAeotec(data) {
    // Check if this is an EXE file
    if (data.readUInt16BE(0) !== 0x4d5a) {
        throw new ZWaveError_1.ZWaveError("This does not appear to be a valid Aeotec updater (not an executable)!", ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
    }
    // The exe file contains the firmware data and filename at the end
    const firmwareStart = data.readUInt32BE(data.length - 8);
    const firmwareLength = data.readUInt32BE(data.length - 4);
    let numControlBytes = 8;
    // Some exe files also contain a 2-byte checksum. The method "ImageCalcCrc16" is used to compute the checksum
    if (data.includes(Buffer.from("ImageCalcCrc16", "ascii"))) {
        numControlBytes += 2;
    }
    // Some files don't have such a strict alignment - in that case fall back to ignoring the non-aligned control bytes
    switch (true) {
        case firmwareStart + firmwareLength ===
            data.length - 256 - numControlBytes:
            // all good
            break;
        case firmwareStart + firmwareLength === data.length - 256 - 8:
            numControlBytes = 8;
            break;
        default:
            throw new ZWaveError_1.ZWaveError("This does not appear to be a valid Aeotec updater (invalid firmware length)!", ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
    }
    const firmwareData = data.slice(firmwareStart, firmwareStart + firmwareLength);
    const firmwareNameBytes = data
        .slice(data.length - 256 - numControlBytes)
        .slice(0, 256);
    // Some exe files contain a CRC-16 checksum, extract that too and check it
    if (numControlBytes === 10) {
        const checksum = data.readUInt16BE(data.length - 10);
        const actualChecksum = (0, crc_1.CRC16_CCITT)(Buffer.concat([firmwareData, firmwareNameBytes]), 0xfe95);
        if (checksum !== actualChecksum) {
            throw new ZWaveError_1.ZWaveError("This does not appear to be a valid Aeotec updater (invalid checksum)!", ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
    }
    // Some updaters contain the firmware target in the first byte of the name
    // We can't test this, so we have to assume the value translates to a non-printable ASCII char (less than " ")
    const firmwareTarget = firmwareNameBytes[0] < 0x20 ? firmwareNameBytes[0] : undefined;
    const firmwareNameOffset = firmwareTarget == undefined ? 0 : 1;
    const firmwareName = firmwareNameBytes
        .slice(firmwareNameOffset, firmwareNameBytes.indexOf(0, firmwareNameOffset))
        .toString("utf8");
    if (!/^[a-zA-Z0-9_ -]+$/.test(firmwareName)) {
        throw new ZWaveError_1.ZWaveError("This does not appear to be a valid Aeotec updater (invalid firmware name)!", ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
    }
    // The filename includes which chip is being targeted
    const ret = {
        data: firmwareData,
    };
    if (firmwareTarget != undefined) {
        ret.firmwareTarget = firmwareTarget;
    }
    if (/__TargetZwave__/.test(firmwareName)) {
        ret.firmwareTarget = 0;
    }
    else {
        const match = /__TargetMcu(\d)__/.exec(firmwareName);
        if (match)
            ret.firmwareTarget = +match[1];
    }
    return ret;
}
function extractFirmwareHEX(dataHEX) {
    try {
        if (Buffer.isBuffer(dataHEX)) {
            dataHEX = dataHEX.toString("ascii");
        }
        const memMap = nrf_intel_hex_1.default.fromHex(dataHEX);
        // A memory map can be sparse - we'll have to fill the gaps with 0xFF
        let data = Buffer.from([]);
        for (const [offset, chunk] of memMap.entries()) {
            data = Buffer.concat([
                data,
                Buffer.alloc(offset - data.length, 0xff),
                chunk,
            ]);
        }
        return { data };
    }
    catch (e) {
        if (/Malformed/.test((0, shared_1.getErrorMessage)(e))) {
            throw new ZWaveError_1.ZWaveError("Could not parse HEX firmware file!", ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else {
            throw e;
        }
    }
}
function extractFirmwareHEC(data) {
    const key = "d7a68def0f4a1241940f6cb8017121d15f0e2682e258c9f7553e706e834923b7";
    const iv = "0e6519297530583708612a2823663844";
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.from(iv, "hex"));
    const ciphertext = Buffer.from(data.slice(6).toString("ascii"), "base64");
    const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ])
        .toString("ascii")
        .replace(/ /g, "\n");
    return extractFirmwareHEX(plaintext);
}
//# sourceMappingURL=firmware.js.map