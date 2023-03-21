"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dumpObject = exports.dumpPage = exports.mapToObject = exports.validateBergerCodeMulti = exports.computeBergerCodeMulti = exports.validateBergerCode = exports.computeBergerCode = void 0;
const safe_1 = require("@zwave-js/core/safe");
const NVMFile_1 = require("../files/NVMFile");
const consts_1 = require("./consts");
/** Counts the number of unset bits in the given word */
function computeBergerCode(word, numBits = 32) {
    let ret = word;
    // Mask the number of bits we're interested in
    if (numBits < 32) {
        ret &= (1 << numBits) - 1;
    }
    // And count the bits, see http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetParallel
    ret = ret - ((ret >> 1) & 0x55555555);
    ret = (ret & 0x33333333) + ((ret >> 2) & 0x33333333);
    ret = (((ret + (ret >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
    return numBits - ret;
}
exports.computeBergerCode = computeBergerCode;
function validateBergerCode(word, code, numBits = 32) {
    if (computeBergerCode(word, numBits) !== code) {
        throw new safe_1.ZWaveError("Berger Code validation failed!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
    }
}
exports.validateBergerCode = validateBergerCode;
function computeBergerCodeMulti(words, numBits) {
    let ret = 0;
    for (const word of words) {
        ret += computeBergerCode(word, Math.min(numBits, 32));
        if (numBits < 32)
            break;
        numBits -= 32;
    }
    return ret;
}
exports.computeBergerCodeMulti = computeBergerCodeMulti;
function validateBergerCodeMulti(words, numBits) {
    let actual = 0;
    let expected;
    for (const word of words) {
        actual += computeBergerCode(word, Math.min(numBits, 32));
        if (numBits < 32) {
            const maskSize = 32 - numBits;
            const mask = (1 << maskSize) - 1;
            expected = (word >>> numBits) & mask;
            break;
        }
        numBits -= 32;
    }
    if (actual !== expected) {
        throw new safe_1.ZWaveError("Berger Code validation failed!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
    }
}
exports.validateBergerCodeMulti = validateBergerCodeMulti;
function mapToObject(map) {
    const obj = {};
    for (const [key, value] of map) {
        obj[key] = value;
    }
    return obj;
}
exports.mapToObject = mapToObject;
function dumpPage(page, json = false) {
    console.log(` `);
    console.log(`read page (offset 0x${page.header.offset.toString(16)}):`);
    console.log(`  version: ${page.header.version}`);
    console.log(`  eraseCount: ${page.header.eraseCount}`);
    console.log(`  status: ${consts_1.PageStatus[page.header.status]}`);
    console.log(`  encrypted: ${page.header.encrypted}`);
    console.log(`  pageSize: ${page.header.pageSize}`);
    console.log(`  writeSize: ${page.header.writeSize}`);
    console.log(`  memoryMapped: ${page.header.memoryMapped}`);
    console.log(`  deviceFamily: ${page.header.deviceFamily}`);
    console.log("");
    console.log(`  objects:`);
    for (const obj of page.objects) {
        dumpObject(obj, json);
    }
}
exports.dumpPage = dumpPage;
function dumpObject(obj, json = false) {
    try {
        if (json) {
            const file = NVMFile_1.NVMFile.from(obj, "7.0.0");
            console.log(`${JSON.stringify(file.toJSON(), null, 2)}`);
            console.log();
            return;
        }
    }
    catch {
        // ignore
    }
    const prefix = json ? "" : "  ";
    console.log(`${prefix}· key: 0x${obj.key.toString(16)}`);
    console.log(`${prefix}  type: ${consts_1.ObjectType[obj.type]}`);
    console.log(`${prefix}  fragment type: ${consts_1.FragmentType[obj.fragmentType]}`);
    if (obj.data) {
        console.log(`${prefix}  data: ${obj.data.toString("hex")} (${obj.data.length} bytes)`);
    }
    console.log();
}
exports.dumpObject = dumpObject;
//# sourceMappingURL=utils.js.map