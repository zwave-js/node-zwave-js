"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeNVM500NodeInfo = exports.parseNVM500NodeInfo = exports.encodeNVMModuleDescriptor = exports.parseNVMModuleDescriptor = exports.encodeNVMDescriptor = exports.parseNVMDescriptor = void 0;
const safe_1 = require("@zwave-js/core/safe");
const strings_1 = require("alcalzone-shared/strings");
function parseNVMDescriptor(buffer, offset = 0) {
    return {
        manufacturerID: buffer.readUInt16BE(offset),
        firmwareID: buffer.readUInt16BE(offset + 2),
        productType: buffer.readUInt16BE(offset + 4),
        productID: buffer.readUInt16BE(offset + 6),
        firmwareVersion: `${buffer[offset + 8]}.${buffer[offset + 9]}`,
        // Z-Wave protocol versions are formatted as "6.07" and similar
        protocolVersion: `${buffer[offset + 10]}.${(0, strings_1.padStart)(buffer[offset + 11].toString(), 2, "0")}`,
    };
}
exports.parseNVMDescriptor = parseNVMDescriptor;
function encodeNVMDescriptor(descriptor) {
    const ret = Buffer.allocUnsafe(12);
    ret.writeUInt16BE(descriptor.manufacturerID, 0);
    ret.writeUInt16BE(descriptor.firmwareID, 2);
    ret.writeUInt16BE(descriptor.productType, 4);
    ret.writeUInt16BE(descriptor.productID, 6);
    const fwVersionParts = descriptor.firmwareVersion
        .split(".")
        .map((i) => parseInt(i));
    ret[8] = fwVersionParts[0];
    ret[9] = fwVersionParts[1];
    const protocolVersionParts = descriptor.protocolVersion
        .split(".")
        .map((i) => parseInt(i));
    ret[10] = protocolVersionParts[0];
    ret[11] = protocolVersionParts[1];
    return ret;
}
exports.encodeNVMDescriptor = encodeNVMDescriptor;
function parseNVMModuleDescriptor(buffer, offset = 0) {
    return {
        size: buffer.readUInt16BE(offset),
        type: buffer[offset + 2],
        version: `${buffer[offset + 3]}.${buffer[offset + 4]}`,
    };
}
exports.parseNVMModuleDescriptor = parseNVMModuleDescriptor;
function encodeNVMModuleDescriptor(descriptior) {
    const ret = Buffer.allocUnsafe(5);
    ret.writeUInt16BE(descriptior.size, 0);
    ret[2] = descriptior.type;
    const versionParts = descriptior.version.split(".").map((i) => parseInt(i));
    ret[3] = versionParts[0];
    ret[4] = versionParts[1];
    return ret;
}
exports.encodeNVMModuleDescriptor = encodeNVMModuleDescriptor;
function parseNVM500NodeInfo(buffer, offset) {
    const { hasSpecificDeviceClass, ...protocolInfo } = (0, safe_1.parseNodeProtocolInfo)(buffer, offset);
    const genericDeviceClass = buffer[offset + 3];
    const specificDeviceClass = hasSpecificDeviceClass
        ? buffer[offset + 4]
        : null;
    return {
        ...protocolInfo,
        genericDeviceClass,
        specificDeviceClass,
    };
}
exports.parseNVM500NodeInfo = parseNVM500NodeInfo;
function encodeNVM500NodeInfo(nodeInfo) {
    return Buffer.concat([
        (0, safe_1.encodeNodeProtocolInfo)({
            ...nodeInfo,
            hasSpecificDeviceClass: !!nodeInfo.specificDeviceClass,
        }),
        Buffer.from([
            nodeInfo.genericDeviceClass,
            nodeInfo.specificDeviceClass ?? 0,
        ]),
    ]);
}
exports.encodeNVM500NodeInfo = encodeNVM500NodeInfo;
//# sourceMappingURL=EntryParsers.js.map