"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolLRNodeListFileID = exports.ProtocolLRNodeListFile = exports.ProtocolRouteCacheExistsNodeMaskFileID = exports.ProtocolRouteCacheExistsNodeMaskFile = exports.ProtocolPendingDiscoveryNodeMaskFileID = exports.ProtocolPendingDiscoveryNodeMaskFile = exports.ProtocolVirtualNodeMaskFileID = exports.ProtocolVirtualNodeMaskFile = exports.ProtocolSUCPendingUpdateNodeMaskFileID = exports.ProtocolSUCPendingUpdateNodeMaskFile = exports.ProtocolRouteSlaveSUCNodeMaskFileID = exports.ProtocolRouteSlaveSUCNodeMaskFile = exports.ProtocolAppRouteLockNodeMaskFileID = exports.ProtocolAppRouteLockNodeMaskFile = exports.ProtocolNodeListFileID = exports.ProtocolNodeListFile = exports.ProtocolPreferredRepeatersFileID = exports.ProtocolPreferredRepeatersFile = exports.ProtocolNodeMaskFile = void 0;
const safe_1 = require("@zwave-js/core/safe");
const NVMFile_1 = require("./NVMFile");
class ProtocolNodeMaskFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.nodeIds = (0, safe_1.parseBitMask)(this.payload);
        }
        else {
            this.nodeIds = options.nodeIds;
        }
    }
    serialize() {
        this.payload = (0, safe_1.encodeBitMask)(this.nodeIds, safe_1.NODE_ID_MAX);
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            "node IDs": this.nodeIds.join(", "),
        };
    }
}
exports.ProtocolNodeMaskFile = ProtocolNodeMaskFile;
let ProtocolPreferredRepeatersFile = class ProtocolPreferredRepeatersFile extends ProtocolNodeMaskFile {
};
ProtocolPreferredRepeatersFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50002)
], ProtocolPreferredRepeatersFile);
exports.ProtocolPreferredRepeatersFile = ProtocolPreferredRepeatersFile;
exports.ProtocolPreferredRepeatersFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolPreferredRepeatersFile);
let ProtocolNodeListFile = class ProtocolNodeListFile extends ProtocolNodeMaskFile {
};
ProtocolNodeListFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50005)
], ProtocolNodeListFile);
exports.ProtocolNodeListFile = ProtocolNodeListFile;
exports.ProtocolNodeListFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolNodeListFile);
let ProtocolAppRouteLockNodeMaskFile = class ProtocolAppRouteLockNodeMaskFile extends ProtocolNodeMaskFile {
};
ProtocolAppRouteLockNodeMaskFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50006)
], ProtocolAppRouteLockNodeMaskFile);
exports.ProtocolAppRouteLockNodeMaskFile = ProtocolAppRouteLockNodeMaskFile;
exports.ProtocolAppRouteLockNodeMaskFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolAppRouteLockNodeMaskFile);
let ProtocolRouteSlaveSUCNodeMaskFile = class ProtocolRouteSlaveSUCNodeMaskFile extends ProtocolNodeMaskFile {
};
ProtocolRouteSlaveSUCNodeMaskFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50007)
], ProtocolRouteSlaveSUCNodeMaskFile);
exports.ProtocolRouteSlaveSUCNodeMaskFile = ProtocolRouteSlaveSUCNodeMaskFile;
exports.ProtocolRouteSlaveSUCNodeMaskFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolRouteSlaveSUCNodeMaskFile);
let ProtocolSUCPendingUpdateNodeMaskFile = class ProtocolSUCPendingUpdateNodeMaskFile extends ProtocolNodeMaskFile {
};
ProtocolSUCPendingUpdateNodeMaskFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50008)
], ProtocolSUCPendingUpdateNodeMaskFile);
exports.ProtocolSUCPendingUpdateNodeMaskFile = ProtocolSUCPendingUpdateNodeMaskFile;
exports.ProtocolSUCPendingUpdateNodeMaskFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolSUCPendingUpdateNodeMaskFile);
let ProtocolVirtualNodeMaskFile = class ProtocolVirtualNodeMaskFile extends ProtocolNodeMaskFile {
};
ProtocolVirtualNodeMaskFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50009)
], ProtocolVirtualNodeMaskFile);
exports.ProtocolVirtualNodeMaskFile = ProtocolVirtualNodeMaskFile;
exports.ProtocolVirtualNodeMaskFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolVirtualNodeMaskFile);
let ProtocolPendingDiscoveryNodeMaskFile = class ProtocolPendingDiscoveryNodeMaskFile extends ProtocolNodeMaskFile {
};
ProtocolPendingDiscoveryNodeMaskFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x5000a)
], ProtocolPendingDiscoveryNodeMaskFile);
exports.ProtocolPendingDiscoveryNodeMaskFile = ProtocolPendingDiscoveryNodeMaskFile;
exports.ProtocolPendingDiscoveryNodeMaskFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolPendingDiscoveryNodeMaskFile);
let ProtocolRouteCacheExistsNodeMaskFile = class ProtocolRouteCacheExistsNodeMaskFile extends ProtocolNodeMaskFile {
};
ProtocolRouteCacheExistsNodeMaskFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x5000b)
], ProtocolRouteCacheExistsNodeMaskFile);
exports.ProtocolRouteCacheExistsNodeMaskFile = ProtocolRouteCacheExistsNodeMaskFile;
exports.ProtocolRouteCacheExistsNodeMaskFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolRouteCacheExistsNodeMaskFile);
let ProtocolLRNodeListFile = class ProtocolLRNodeListFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.nodeIds = (0, safe_1.parseBitMask)(this.payload, 256);
        }
        else {
            this.nodeIds = options.nodeIds;
        }
    }
    serialize() {
        // There are only 128 bytes for the bitmask, so the LR node IDs only go up to 1279
        this.payload = (0, safe_1.encodeBitMask)(this.nodeIds, 1279, 256);
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            payload: this.payload.toString("hex"),
            "node IDs": this.nodeIds.join(", "),
        };
    }
};
ProtocolLRNodeListFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x5000c)
], ProtocolLRNodeListFile);
exports.ProtocolLRNodeListFile = ProtocolLRNodeListFile;
exports.ProtocolLRNodeListFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolLRNodeListFile);
//# sourceMappingURL=ProtocolNodeMaskFiles.js.map