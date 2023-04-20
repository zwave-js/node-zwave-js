"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeNodeInformationFrame = exports.parseNodeInformationFrame = exports.encodeNodeProtocolInfoAndDeviceClass = exports.parseNodeProtocolInfoAndDeviceClass = exports.encodeNodeProtocolInfo = exports.parseNodeProtocolInfo = exports.NodeType = exports.ProtocolVersion = exports.encodeCCList = exports.parseCCList = exports.encodeCCId = exports.parseCCId = exports.isExtendedCCId = exports.encodeNodeUpdatePayload = exports.parseNodeUpdatePayload = exports.encodeApplicationNodeInformation = exports.parseApplicationNodeInformation = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const misc_1 = require("../util/misc");
const CommandClasses_1 = require("./CommandClasses");
function parseApplicationNodeInformation(nif) {
    (0, misc_1.validatePayload)(nif.length >= 2);
    return {
        genericDeviceClass: nif[0],
        specificDeviceClass: nif[1],
        supportedCCs: parseCCList(nif.slice(2)).supportedCCs,
    };
}
exports.parseApplicationNodeInformation = parseApplicationNodeInformation;
function encodeApplicationNodeInformation(nif) {
    const ccList = encodeCCList(nif.supportedCCs, []);
    return Buffer.concat([
        Buffer.from([nif.genericDeviceClass, nif.specificDeviceClass]),
        ccList,
    ]);
}
exports.encodeApplicationNodeInformation = encodeApplicationNodeInformation;
function parseNodeUpdatePayload(nif) {
    const nodeId = nif[0];
    const remainingLength = nif[1];
    (0, misc_1.validatePayload)(nif.length >= 2 + remainingLength);
    return {
        nodeId,
        basicDeviceClass: nif[2],
        ...parseApplicationNodeInformation(nif.slice(3, 2 + remainingLength)),
    };
}
exports.parseNodeUpdatePayload = parseNodeUpdatePayload;
function encodeNodeUpdatePayload(nif) {
    const ccList = encodeCCList(nif.supportedCCs, []);
    return Buffer.concat([
        Buffer.from([
            nif.nodeId,
            3 + ccList.length,
            nif.basicDeviceClass,
            nif.genericDeviceClass,
            nif.specificDeviceClass,
        ]),
        ccList,
    ]);
}
exports.encodeNodeUpdatePayload = encodeNodeUpdatePayload;
function isExtendedCCId(ccId) {
    return ccId >= 0xf1;
}
exports.isExtendedCCId = isExtendedCCId;
/**
 * Reads a CC id from the given buffer, returning the parsed CC id and the number of bytes read
 * @param offset The offset at which the CC id is located
 */
function parseCCId(payload, offset = 0) {
    const isExtended = isExtendedCCId(payload[offset]);
    (0, misc_1.validatePayload)(payload.length >= offset + (isExtended ? 2 : 1));
    if (isExtended) {
        return { ccId: payload.readUInt16BE(offset), bytesRead: 2 };
    }
    else {
        return { ccId: payload.readUInt8(offset), bytesRead: 1 };
    }
}
exports.parseCCId = parseCCId;
/**
 * Writes the given CC id into the given buffer at the given location
 * @returns The number of bytes written
 */
function encodeCCId(ccId, payload, offset = 0) {
    if (isExtendedCCId(ccId)) {
        payload.writeUInt16BE(ccId, offset);
        return 2;
    }
    else {
        payload.writeUInt8(ccId, offset);
        return 1;
    }
}
exports.encodeCCId = encodeCCId;
function parseCCList(payload) {
    const ret = {
        supportedCCs: [],
        controlledCCs: [],
    };
    let offset = 0;
    let isAfterMark = false;
    while (offset < payload.length) {
        // Read either the normal or extended ccId
        const { ccId: cc, bytesRead } = parseCCId(payload, offset);
        offset += bytesRead;
        // CCs before the support/control mark are supported
        // CCs after the support/control mark are controlled
        if (cc === CommandClasses_1.CommandClasses["Support/Control Mark"]) {
            isAfterMark = true;
            continue;
        }
        (isAfterMark ? ret.controlledCCs : ret.supportedCCs).push(cc);
    }
    return ret;
}
exports.parseCCList = parseCCList;
function encodeCCList(supportedCCs, controlledCCs) {
    const bufferLength = (0, safe_1.sum)(supportedCCs.map((cc) => (isExtendedCCId(cc) ? 2 : 1))) +
        (controlledCCs.length > 0 ? 1 : 0) + // support/control mark
        (0, safe_1.sum)(controlledCCs.map((cc) => (isExtendedCCId(cc) ? 2 : 1)));
    const ret = Buffer.allocUnsafe(bufferLength);
    let offset = 0;
    for (const cc of supportedCCs) {
        offset += encodeCCId(cc, ret, offset);
    }
    if (controlledCCs.length > 0) {
        ret[offset++] = CommandClasses_1.CommandClasses["Support/Control Mark"];
        for (const cc of controlledCCs) {
            offset += encodeCCId(cc, ret, offset);
        }
    }
    return ret;
}
exports.encodeCCList = encodeCCList;
var ProtocolVersion;
(function (ProtocolVersion) {
    ProtocolVersion[ProtocolVersion["unknown"] = 0] = "unknown";
    ProtocolVersion[ProtocolVersion["2.0"] = 1] = "2.0";
    ProtocolVersion[ProtocolVersion["4.2x / 5.0x"] = 2] = "4.2x / 5.0x";
    ProtocolVersion[ProtocolVersion["4.5x / 6.0x"] = 3] = "4.5x / 6.0x";
})(ProtocolVersion = exports.ProtocolVersion || (exports.ProtocolVersion = {}));
var NodeType;
(function (NodeType) {
    NodeType[NodeType["Controller"] = 0] = "Controller";
    /** @deprecated Use `NodeType["End Node"]` instead */
    NodeType[NodeType["Routing End Node"] = 1] = "Routing End Node";
    NodeType[NodeType["End Node"] = 1] = "End Node";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
function parseNodeProtocolInfo(buffer, offset) {
    (0, misc_1.validatePayload)(buffer.length >= offset + 3);
    const isListening = !!(buffer[offset] & 128);
    const isRouting = !!(buffer[offset] & 64);
    const supportedDataRates = [];
    const maxSpeed = buffer[offset] & 24;
    const speedExtension = buffer[offset + 2] & 0b111;
    if (maxSpeed & 16) {
        supportedDataRates.push(40000);
    }
    if (maxSpeed & 8) {
        supportedDataRates.push(9600);
    }
    if (speedExtension & 0b001) {
        supportedDataRates.push(100000);
    }
    if (supportedDataRates.length === 0) {
        supportedDataRates.push(9600);
    }
    const protocolVersion = buffer[offset] & 0b111;
    const capability = buffer[offset + 1];
    const optionalFunctionality = !!(capability & 128);
    let isFrequentListening;
    switch (capability & 96) {
        case 64:
            isFrequentListening = "1000ms";
            break;
        case 32:
            isFrequentListening = "250ms";
            break;
        default:
            isFrequentListening = false;
    }
    const supportsBeaming = !!(capability & 16);
    let nodeType;
    switch (capability & 0b1010) {
        case 0b1000:
            nodeType = NodeType["End Node"];
            break;
        case 0b0010:
        default:
            nodeType = NodeType.Controller;
            break;
    }
    const hasSpecificDeviceClass = !!(capability & 0b100);
    const supportsSecurity = !!(capability & 0b1);
    return {
        isListening,
        isFrequentListening,
        isRouting,
        supportedDataRates,
        protocolVersion,
        optionalFunctionality,
        nodeType,
        supportsSecurity,
        supportsBeaming,
        hasSpecificDeviceClass,
    };
}
exports.parseNodeProtocolInfo = parseNodeProtocolInfo;
function encodeNodeProtocolInfo(info) {
    const ret = Buffer.alloc(3, 0);
    // Byte 0 and 2
    if (info.isListening)
        ret[0] |= 128;
    if (info.isRouting)
        ret[0] |= 64;
    if (info.supportedDataRates.includes(40000))
        ret[0] |= 16;
    if (info.supportedDataRates.includes(9600))
        ret[0] |= 8;
    if (info.supportedDataRates.includes(100000))
        ret[2] |= 0b001;
    ret[0] |= info.protocolVersion & 0b111;
    // Byte 1
    if (info.optionalFunctionality)
        ret[1] |= 128;
    if (info.isFrequentListening === "1000ms")
        ret[1] |= 64;
    else if (info.isFrequentListening === "250ms")
        ret[1] |= 32;
    if (info.supportsBeaming)
        ret[1] |= 16;
    if (info.supportsSecurity)
        ret[1] |= 0b1;
    if (info.nodeType === NodeType["End Node"])
        ret[1] |= 0b1000;
    else
        ret[1] |= 0b0010; // Controller
    if (info.hasSpecificDeviceClass)
        ret[1] |= 0b100;
    return ret;
}
exports.encodeNodeProtocolInfo = encodeNodeProtocolInfo;
function parseNodeProtocolInfoAndDeviceClass(buffer) {
    (0, misc_1.validatePayload)(buffer.length >= 5);
    const protocolInfo = parseNodeProtocolInfo(buffer, 0);
    let offset = 3;
    const basic = buffer[offset++];
    const generic = buffer[offset++];
    let specific = 0;
    if (protocolInfo.hasSpecificDeviceClass) {
        (0, misc_1.validatePayload)(buffer.length >= offset + 1);
        specific = buffer[offset++];
    }
    return {
        info: {
            ...protocolInfo,
            basicDeviceClass: basic,
            genericDeviceClass: generic,
            specificDeviceClass: specific,
        },
        bytesRead: offset,
    };
}
exports.parseNodeProtocolInfoAndDeviceClass = parseNodeProtocolInfoAndDeviceClass;
function encodeNodeProtocolInfoAndDeviceClass(info) {
    return Buffer.concat([
        encodeNodeProtocolInfo({ ...info, hasSpecificDeviceClass: true }),
        Buffer.from([
            info.basicDeviceClass,
            info.genericDeviceClass,
            info.specificDeviceClass,
        ]),
    ]);
}
exports.encodeNodeProtocolInfoAndDeviceClass = encodeNodeProtocolInfoAndDeviceClass;
function parseNodeInformationFrame(buffer) {
    const { info, bytesRead: offset } = parseNodeProtocolInfoAndDeviceClass(buffer);
    const supportedCCs = parseCCList(buffer.slice(offset)).supportedCCs;
    return {
        ...info,
        supportedCCs,
    };
}
exports.parseNodeInformationFrame = parseNodeInformationFrame;
function encodeNodeInformationFrame(info) {
    return Buffer.concat([
        encodeNodeProtocolInfoAndDeviceClass(info),
        encodeCCList(info.supportedCCs, []),
    ]);
}
exports.encodeNodeInformationFrame = encodeNodeInformationFrame;
//# sourceMappingURL=NodeInfo.js.map