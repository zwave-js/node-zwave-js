"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtocolVersionFileID = exports.ProtocolVersionFile = exports.ApplicationVersionFileID = exports.ApplicationVersionFile = exports.VersionFile = void 0;
const NVMFile_1 = require("./NVMFile");
class VersionFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.format = this.payload[3];
            this.major = this.payload[2];
            this.minor = this.payload[1];
            this.patch = this.payload[0];
        }
        else {
            this.format = options.format;
            this.major = options.major;
            this.minor = options.minor;
            this.patch = options.patch;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.patch,
            this.minor,
            this.major,
            this.format,
        ]);
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            format: this.format,
            version: `${this.major}.${this.minor}.${this.patch}`,
        };
    }
}
exports.VersionFile = VersionFile;
let ApplicationVersionFile = class ApplicationVersionFile extends VersionFile {
};
ApplicationVersionFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x51000)
], ApplicationVersionFile);
exports.ApplicationVersionFile = ApplicationVersionFile;
exports.ApplicationVersionFileID = (0, NVMFile_1.getNVMFileIDStatic)(ApplicationVersionFile);
let ProtocolVersionFile = class ProtocolVersionFile extends VersionFile {
};
ProtocolVersionFile = __decorate([
    (0, NVMFile_1.nvmFileID)(0x50000)
], ProtocolVersionFile);
exports.ProtocolVersionFile = ProtocolVersionFile;
exports.ProtocolVersionFileID = (0, NVMFile_1.getNVMFileIDStatic)(ProtocolVersionFile);
//# sourceMappingURL=VersionFiles.js.map