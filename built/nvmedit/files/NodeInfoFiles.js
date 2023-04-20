"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeInfoFileV1 = exports.nodeIdToNodeInfoFileIDV1 = exports.NodeInfoFileV1IDBase = exports.NodeInfoFileV0 = exports.nodeIdToNodeInfoFileIDV0 = exports.NodeInfoFileV0IDBase = exports.NODEINFOS_PER_FILE_V1 = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const NVMFile_1 = require("./NVMFile");
exports.NODEINFOS_PER_FILE_V1 = 4;
const NODEINFO_SIZE = 1 + 5 + safe_1.NUM_NODEMASK_BYTES;
const EMPTY_NODEINFO_FILL = 0xff;
const emptyNodeInfo = Buffer.alloc(NODEINFO_SIZE, EMPTY_NODEINFO_FILL);
function parseNodeInfo(nodeId, buffer, offset) {
    const { hasSpecificDeviceClass, ...protocolInfo } = (0, safe_1.parseNodeProtocolInfo)(buffer, offset);
    const genericDeviceClass = buffer[offset + 3];
    const specificDeviceClass = hasSpecificDeviceClass
        ? buffer[offset + 4]
        : null;
    const neighbors = (0, safe_1.parseBitMask)(buffer.slice(offset + 5, offset + 5 + safe_1.NUM_NODEMASK_BYTES));
    const sucUpdateIndex = buffer[offset + 5 + safe_1.NUM_NODEMASK_BYTES];
    return {
        nodeId,
        ...protocolInfo,
        genericDeviceClass,
        specificDeviceClass,
        neighbors,
        sucUpdateIndex,
    };
}
function encodeNodeInfo(nodeInfo) {
    const ret = Buffer.alloc(1 + 5 + safe_1.NUM_NODEMASK_BYTES);
    const hasSpecificDeviceClass = nodeInfo.specificDeviceClass != null;
    const protocolInfo = {
        ...(0, safe_2.pick)(nodeInfo, [
            "isListening",
            "isFrequentListening",
            "isRouting",
            "supportedDataRates",
            "protocolVersion",
            "optionalFunctionality",
            "nodeType",
            "supportsSecurity",
            "supportsBeaming",
        ]),
        hasSpecificDeviceClass,
    };
    (0, safe_1.encodeNodeProtocolInfo)(protocolInfo).copy(ret, 0);
    ret[3] = nodeInfo.genericDeviceClass;
    if (hasSpecificDeviceClass)
        ret[4] = nodeInfo.specificDeviceClass;
    (0, safe_1.encodeBitMask)(nodeInfo.neighbors, safe_1.MAX_NODES).copy(ret, 5);
    ret[5 + safe_1.NUM_NODEMASK_BYTES] = nodeInfo.sucUpdateIndex;
    return ret;
}
exports.NodeInfoFileV0IDBase = 0x50100;
function nodeIdToNodeInfoFileIDV0(nodeId) {
    return exports.NodeInfoFileV0IDBase + nodeId - 1;
}
exports.nodeIdToNodeInfoFileIDV0 = nodeIdToNodeInfoFileIDV0;
let NodeInfoFileV0 = class NodeInfoFileV0 extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.nodeInfo = parseNodeInfo(this.fileId - exports.NodeInfoFileV0IDBase + 1, this.payload, 0);
        }
        else {
            this.nodeInfo = options.nodeInfo;
        }
    }
    serialize() {
        this.fileId = nodeIdToNodeInfoFileIDV0(this.nodeInfo.nodeId);
        this.payload = encodeNodeInfo(this.nodeInfo);
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            nodeInfo: this.nodeInfo,
        };
    }
};
NodeInfoFileV0 = __decorate([
    (0, NVMFile_1.nvmFileID)((id) => id >= exports.NodeInfoFileV0IDBase && id < exports.NodeInfoFileV0IDBase + safe_1.MAX_NODES)
], NodeInfoFileV0);
exports.NodeInfoFileV0 = NodeInfoFileV0;
exports.NodeInfoFileV1IDBase = 0x50200;
function nodeIdToNodeInfoFileIDV1(nodeId) {
    return (exports.NodeInfoFileV1IDBase + Math.floor((nodeId - 1) / exports.NODEINFOS_PER_FILE_V1));
}
exports.nodeIdToNodeInfoFileIDV1 = nodeIdToNodeInfoFileIDV1;
let NodeInfoFileV1 = class NodeInfoFileV1 extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.nodeInfos = [];
            for (let i = 0; i < exports.NODEINFOS_PER_FILE_V1; i++) {
                const nodeId = (this.fileId - exports.NodeInfoFileV1IDBase) *
                    exports.NODEINFOS_PER_FILE_V1 +
                    1 +
                    i;
                const offset = i * 35;
                const entry = this.payload.slice(offset, offset + 35);
                if (entry.equals(emptyNodeInfo))
                    continue;
                const nodeInfo = parseNodeInfo(nodeId, this.payload, i * 35);
                this.nodeInfos.push(nodeInfo);
            }
        }
        else {
            this.nodeInfos = options.nodeInfos;
        }
    }
    serialize() {
        // The infos must be sorted by node ID
        this.nodeInfos.sort((a, b) => a.nodeId - b.nodeId);
        const minNodeId = this.nodeInfos[0].nodeId;
        this.fileId = nodeIdToNodeInfoFileIDV1(minNodeId);
        this.payload = Buffer.alloc(NODEINFO_SIZE * exports.NODEINFOS_PER_FILE_V1, EMPTY_NODEINFO_FILL);
        const minFileNodeId = Math.floor((minNodeId - 1) / exports.NODEINFOS_PER_FILE_V1) *
            exports.NODEINFOS_PER_FILE_V1 +
            1;
        for (const nodeInfo of this.nodeInfos) {
            const offset = (nodeInfo.nodeId - minFileNodeId) * NODEINFO_SIZE;
            encodeNodeInfo(nodeInfo).copy(this.payload, offset);
        }
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            "node infos": this.nodeInfos,
        };
    }
};
NodeInfoFileV1 = __decorate([
    (0, NVMFile_1.nvmFileID)((id) => id >= exports.NodeInfoFileV1IDBase &&
        id < exports.NodeInfoFileV1IDBase + safe_1.MAX_NODES / exports.NODEINFOS_PER_FILE_V1)
], NodeInfoFileV1);
exports.NodeInfoFileV1 = NodeInfoFileV1;
//# sourceMappingURL=NodeInfoFiles.js.map