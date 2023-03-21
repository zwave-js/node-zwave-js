"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePageHeader = exports.readPage = exports.pageSizeFromBits = exports.pageSizeToBits = void 0;
const safe_1 = require("@zwave-js/core/safe");
const consts_1 = require("./consts");
const object_1 = require("./object");
const utils_1 = require("./utils");
// The page size field has a value from 0 to 7 describing page sizes from 512 to 65536 bytes
function pageSizeToBits(pageSize) {
    return Math.ceil(Math.log2(pageSize) - Math.log2(consts_1.NVM3_MIN_PAGE_SIZE));
}
exports.pageSizeToBits = pageSizeToBits;
function pageSizeFromBits(bits) {
    return consts_1.NVM3_MIN_PAGE_SIZE * Math.pow(2, bits);
}
exports.pageSizeFromBits = pageSizeFromBits;
function readPage(buffer, offset) {
    const version = buffer.readUInt16LE(offset);
    const magic = buffer.readUInt16LE(offset + 2);
    if (magic !== consts_1.NVM3_PAGE_MAGIC) {
        throw new safe_1.ZWaveError("Not a valid NVM3 page!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
    }
    if (version !== 0x01) {
        throw new safe_1.ZWaveError(`Unsupported NVM3 page version: ${version}`, safe_1.ZWaveErrorCodes.NVM_NotSupported);
    }
    // The erase counter is saved twice, once normally, once inverted
    let eraseCount = buffer.readUInt32LE(offset + 4);
    const eraseCountCode = eraseCount >>> consts_1.NVM3_PAGE_COUNTER_SIZE;
    eraseCount &= consts_1.NVM3_PAGE_COUNTER_MASK;
    (0, utils_1.validateBergerCode)(eraseCount, eraseCountCode, consts_1.NVM3_PAGE_COUNTER_SIZE);
    let eraseCountInv = buffer.readUInt32LE(offset + 8);
    const eraseCountInvCode = eraseCountInv >>> consts_1.NVM3_PAGE_COUNTER_SIZE;
    eraseCountInv &= consts_1.NVM3_PAGE_COUNTER_MASK;
    (0, utils_1.validateBergerCode)(eraseCountInv, eraseCountInvCode, consts_1.NVM3_PAGE_COUNTER_SIZE);
    if (eraseCount !== (~eraseCountInv & consts_1.NVM3_PAGE_COUNTER_MASK)) {
        throw new safe_1.ZWaveError("Invalid erase count!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
    }
    // Page status
    const status = buffer.readUInt32LE(offset + 12);
    const devInfo = buffer.readUInt16LE(offset + 16);
    const deviceFamily = devInfo & 0x7ff;
    const writeSize = (devInfo >> 11) & 0b1;
    const memoryMapped = !!((devInfo >> 12) & 0b1);
    const pageSize = pageSizeFromBits((devInfo >> 13) & 0b111);
    // Application NVM pages seem to get written with a page size of 0xffff
    const actualPageSize = Math.min(pageSize, consts_1.FLASH_MAX_PAGE_SIZE);
    if (buffer.length < offset + actualPageSize) {
        throw new safe_1.ZWaveError("Incomplete page in buffer!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
    }
    const formatInfo = buffer.readUInt16LE(offset + 18);
    const encrypted = !(formatInfo & 0b1);
    const header = {
        offset,
        version,
        eraseCount,
        status,
        encrypted,
        pageSize,
        writeSize,
        memoryMapped,
        deviceFamily,
    };
    const bytesRead = actualPageSize;
    const data = buffer.slice(offset + 20, offset + bytesRead);
    const { objects } = (0, object_1.readObjects)(data);
    return {
        page: { header, objects },
        bytesRead,
    };
}
exports.readPage = readPage;
function writePageHeader(header) {
    const ret = Buffer.alloc(consts_1.NVM3_PAGE_HEADER_SIZE);
    ret.writeUInt16LE(header.version, 0);
    ret.writeUInt16LE(consts_1.NVM3_PAGE_MAGIC, 2);
    let eraseCount = header.eraseCount & consts_1.NVM3_PAGE_COUNTER_MASK;
    const eraseCountCode = (0, utils_1.computeBergerCode)(eraseCount, consts_1.NVM3_PAGE_COUNTER_SIZE);
    eraseCount |= eraseCountCode << consts_1.NVM3_PAGE_COUNTER_SIZE;
    ret.writeInt32LE(eraseCount, 4);
    let eraseCountInv = ~header.eraseCount & consts_1.NVM3_PAGE_COUNTER_MASK;
    const eraseCountInvCode = (0, utils_1.computeBergerCode)(eraseCountInv, consts_1.NVM3_PAGE_COUNTER_SIZE);
    eraseCountInv |= eraseCountInvCode << consts_1.NVM3_PAGE_COUNTER_SIZE;
    ret.writeInt32LE(eraseCountInv, 8);
    ret.writeUInt32LE(header.status, 12);
    const devInfo = (header.deviceFamily & 0x7ff) |
        ((header.writeSize & 0b1) << 11) |
        ((header.memoryMapped ? 1 : 0) << 12) |
        (pageSizeToBits(header.pageSize) << 13);
    ret.writeUInt16LE(devInfo, 16);
    const formatInfo = header.encrypted ? 0xfffe : 0xffff;
    ret.writeUInt16LE(formatInfo, 18);
    return ret;
}
exports.writePageHeader = writePageHeader;
//# sourceMappingURL=page.js.map