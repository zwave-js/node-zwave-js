"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressObjects = exports.fragmentLargeObject = exports.writeObject = exports.readObjects = exports.readObject = void 0;
const safe_1 = require("@zwave-js/core/safe");
const consts_1 = require("./consts");
const utils_1 = require("./utils");
function readObject(buffer, offset) {
    let headerSize = 4;
    const hdr1 = buffer.readUInt32LE(offset);
    // Skip over blank page areas
    if (hdr1 === 0xffffffff)
        return;
    const key = (hdr1 >> consts_1.NVM3_OBJ_KEY_SHIFT) & consts_1.NVM3_OBJ_KEY_MASK;
    let objType = hdr1 & consts_1.NVM3_OBJ_TYPE_MASK;
    let fragmentLength = 0;
    let hdr2;
    const isLarge = objType === consts_1.ObjectType.DataLarge || objType === consts_1.ObjectType.CounterLarge;
    if (isLarge) {
        hdr2 = buffer.readUInt32LE(offset + 4);
        headerSize += 4;
        fragmentLength = hdr2 & consts_1.NVM3_OBJ_LARGE_LEN_MASK;
    }
    else if (objType > consts_1.ObjectType.DataSmall) {
        // In small objects with data, the length and object type are stored in the same value
        fragmentLength = objType - consts_1.ObjectType.DataSmall;
        objType = consts_1.ObjectType.DataSmall;
    }
    else if (objType === consts_1.ObjectType.CounterSmall) {
        fragmentLength = consts_1.NVM3_COUNTER_SIZE;
    }
    const fragmentType = isLarge
        ? (hdr1 >>> consts_1.NVM3_OBJ_FRAGTYPE_SHIFT) & consts_1.NVM3_OBJ_FRAGTYPE_MASK
        : consts_1.FragmentType.None;
    if (isLarge) {
        (0, utils_1.validateBergerCodeMulti)([hdr1, hdr2], 32 + consts_1.NVM3_CODE_LARGE_SHIFT);
    }
    else {
        (0, utils_1.validateBergerCodeMulti)([hdr1], consts_1.NVM3_CODE_SMALL_SHIFT);
    }
    if (buffer.length < offset + headerSize + fragmentLength) {
        throw new safe_1.ZWaveError("Incomplete object in buffer!", safe_1.ZWaveErrorCodes.NVM_InvalidFormat);
    }
    let data;
    if (fragmentLength > 0) {
        data = buffer.slice(offset + headerSize, offset + headerSize + fragmentLength);
    }
    const alignedLength = (fragmentLength + consts_1.NVM3_WORD_SIZE - 1) & ~(consts_1.NVM3_WORD_SIZE - 1);
    const bytesRead = headerSize + alignedLength;
    const obj = {
        type: objType,
        fragmentType,
        key,
        data,
    };
    return {
        object: obj,
        bytesRead,
    };
}
exports.readObject = readObject;
function readObjects(buffer) {
    let offset = 0;
    const objects = [];
    while (offset < buffer.length) {
        const result = readObject(buffer, offset);
        if (!result)
            break;
        const { object, bytesRead } = result;
        objects.push(object);
        offset += bytesRead;
    }
    return {
        objects,
        bytesRead: offset,
    };
}
exports.readObjects = readObjects;
function writeObject(obj) {
    const isLarge = obj.type === consts_1.ObjectType.DataLarge ||
        obj.type === consts_1.ObjectType.CounterLarge;
    const headerSize = isLarge
        ? consts_1.NVM3_OBJ_HEADER_SIZE_LARGE
        : consts_1.NVM3_OBJ_HEADER_SIZE_SMALL;
    const dataLength = obj.data?.length ?? 0;
    const ret = Buffer.allocUnsafe(dataLength + headerSize);
    // Write header
    if (isLarge) {
        let hdr2 = dataLength & consts_1.NVM3_OBJ_LARGE_LEN_MASK;
        const hdr1 = (obj.type & consts_1.NVM3_OBJ_TYPE_MASK) |
            ((obj.key & consts_1.NVM3_OBJ_KEY_MASK) << consts_1.NVM3_OBJ_KEY_SHIFT) |
            ((obj.fragmentType & consts_1.NVM3_OBJ_FRAGTYPE_MASK) <<
                consts_1.NVM3_OBJ_FRAGTYPE_SHIFT);
        const bergerCode = (0, utils_1.computeBergerCodeMulti)([hdr1, hdr2], 32 + consts_1.NVM3_CODE_LARGE_SHIFT);
        hdr2 |= bergerCode << consts_1.NVM3_CODE_LARGE_SHIFT;
        ret.writeInt32LE(hdr1, 0);
        ret.writeInt32LE(hdr2, 4);
    }
    else {
        let typeAndLen = obj.type;
        if (typeAndLen === consts_1.ObjectType.DataSmall && dataLength > 0) {
            typeAndLen += dataLength;
        }
        let hdr1 = (typeAndLen & consts_1.NVM3_OBJ_TYPE_MASK) |
            ((obj.key & consts_1.NVM3_OBJ_KEY_MASK) << consts_1.NVM3_OBJ_KEY_SHIFT);
        const bergerCode = (0, utils_1.computeBergerCode)(hdr1, consts_1.NVM3_CODE_SMALL_SHIFT);
        hdr1 |= bergerCode << consts_1.NVM3_CODE_SMALL_SHIFT;
        ret.writeInt32LE(hdr1, 0);
    }
    // Write data
    if (obj.data) {
        obj.data.copy(ret, headerSize);
    }
    return ret;
}
exports.writeObject = writeObject;
function fragmentLargeObject(obj, maxFirstFragmentSizeWithHeader, maxFragmentSizeWithHeader) {
    const ret = [];
    if (obj.data.length + consts_1.NVM3_OBJ_HEADER_SIZE_LARGE <=
        maxFirstFragmentSizeWithHeader) {
        return [obj];
    }
    let offset = 0;
    while (offset < obj.data.length) {
        const fragmentSize = offset === 0
            ? maxFirstFragmentSizeWithHeader - consts_1.NVM3_OBJ_HEADER_SIZE_LARGE
            : maxFragmentSizeWithHeader - consts_1.NVM3_OBJ_HEADER_SIZE_LARGE;
        const data = obj.data.slice(offset, offset + fragmentSize);
        ret.push({
            type: obj.type,
            key: obj.key,
            fragmentType: offset === 0
                ? consts_1.FragmentType.First
                : data.length + consts_1.NVM3_OBJ_HEADER_SIZE_LARGE <
                    maxFragmentSizeWithHeader
                    ? consts_1.FragmentType.Last
                    : consts_1.FragmentType.Next,
            data,
        });
        offset += fragmentSize;
    }
    return ret;
}
exports.fragmentLargeObject = fragmentLargeObject;
/**
 * Takes the raw list of objects from the pages ring buffer and compresses
 * them so that each object is only stored once.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
function compressObjects(objects) {
    const ret = new Map();
    // Only insert valid objects. This means non-fragmented ones, non-deleted ones
    // and fragmented ones in the correct and complete order
    outer: for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        if (obj.type === consts_1.ObjectType.Deleted) {
            ret.delete(obj.key);
            continue;
        }
        else if (obj.fragmentType === consts_1.FragmentType.None) {
            ret.set(obj.key, obj);
            continue;
        }
        else if (obj.fragmentType !== consts_1.FragmentType.First || !obj.data) {
            // This is the broken rest of an overwritten object, skip it
            continue;
        }
        // We're looking at the first fragment of a fragmented object
        const parts = [obj.data];
        for (let j = i + 1; j < objects.length; j++) {
            // The next objects must have the same key and either be the
            // next or the last fragment with data
            const next = objects[j];
            if (next.key !== obj.key || !next.data) {
                // Invalid object, skipping
                continue outer;
            }
            else if (next.fragmentType === consts_1.FragmentType.Next) {
                parts.push(next.data);
            }
            else if (next.fragmentType === consts_1.FragmentType.Last) {
                parts.push(next.data);
                break;
            }
        }
        // Combine all fragments into a single readable object
        ret.set(obj.key, {
            key: obj.key,
            fragmentType: consts_1.FragmentType.None,
            type: obj.type,
            data: Buffer.concat(parts),
        });
    }
    return ret;
}
exports.compressObjects = compressObjects;
//# sourceMappingURL=object.js.map