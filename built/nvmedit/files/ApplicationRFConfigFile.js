"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationRFConfigFileID = exports.ApplicationRFConfigFile = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
const semver_1 = __importDefault(require("semver"));
const NVMFile_1 = require("./NVMFile");
let ApplicationRFConfigFile = class ApplicationRFConfigFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            if (this.payload.length === 3 || this.payload.length === 6) {
                this.rfRegion = this.payload[0];
                this.txPower = this.payload.readIntLE(1, 1) / 10;
                this.measured0dBm = this.payload.readIntLE(2, 1) / 10;
                if (this.payload.length === 6) {
                    this.enablePTI = this.payload[3];
                    this.maxTXPower = this.payload.readInt16LE(4) / 10;
                }
            }
            else if (this.payload.length === 8) {
                this.rfRegion = this.payload[0];
                this.txPower = this.payload.readInt16LE(1) / 10;
                this.measured0dBm = this.payload.readInt16LE(3) / 10;
                this.enablePTI = this.payload[5];
                this.maxTXPower = this.payload.readInt16LE(6) / 10;
            }
            else {
                throw new safe_1.ZWaveError(`ApplicationRFConfigFile has unsupported length ${this.payload.length}`, safe_1.ZWaveErrorCodes.NVM_NotSupported);
            }
        }
        else {
            this.rfRegion = options.rfRegion;
            this.txPower = options.txPower;
            this.measured0dBm = options.measured0dBm;
            this.enablePTI = options.enablePTI;
            this.maxTXPower = options.maxTXPower;
        }
    }
    serialize() {
        if (semver_1.default.lt(this.fileVersion, "7.18.1")) {
            this.payload = Buffer.alloc(semver_1.default.gte(this.fileVersion, "7.15.3") ? 6 : 3, 0);
            this.payload[0] = this.rfRegion;
            this.payload.writeIntLE(this.txPower * 10, 1, 1);
            this.payload.writeIntLE(this.measured0dBm * 10, 2, 1);
            if (semver_1.default.gte(this.fileVersion, "7.15.3")) {
                this.payload[3] = this.enablePTI ?? 0;
                this.payload.writeInt16LE((this.maxTXPower ?? 0) * 10, 4);
            }
        }
        else {
            this.payload = Buffer.alloc(8, 0);
            this.payload[0] = this.rfRegion;
            this.payload.writeInt16LE(this.txPower * 10, 1);
            this.payload.writeInt16LE(this.measured0dBm * 10, 3);
            this.payload[5] = this.enablePTI ?? 0;
            this.payload.writeInt16LE((this.maxTXPower ?? 0) * 10, 6);
        }
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        const ret = {
            ...super.toJSON(),
            "RF Region": (0, safe_2.getEnumMemberName)(safe_1.RFRegion, this.rfRegion),
            "TX Power": `${this.txPower.toFixed(1)} dBm`,
            "Power @ 0dBm": `${this.measured0dBm.toFixed(1)} dBm`,
        };
        if (this.enablePTI != undefined) {
            ret["enable PTI"] = this.enablePTI;
        }
        if (this.maxTXPower != undefined) {
            ret["max TX power"] = `${this.maxTXPower.toFixed(1)} dBm`;
        }
        return ret;
    }
};
ApplicationRFConfigFile = __decorate([
    (0, NVMFile_1.nvmFileID)(104)
], ApplicationRFConfigFile);
exports.ApplicationRFConfigFile = ApplicationRFConfigFile;
exports.ApplicationRFConfigFileID = (0, NVMFile_1.getNVMFileIDStatic)(ApplicationRFConfigFile);
//# sourceMappingURL=ApplicationRFConfigFile.js.map