"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationCCsFileID = exports.ApplicationCCsFile = void 0;
const safe_1 = require("@zwave-js/core/safe");
const NVMFile_1 = require("./NVMFile");
const MAX_CCs = 35;
let ApplicationCCsFile = class ApplicationCCsFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            let offset = 0;
            let numCCs = this.payload[offset];
            this.includedInsecurely = [
                ...this.payload.slice(offset + 1, offset + 1 + numCCs),
            ];
            offset += MAX_CCs;
            numCCs = this.payload[offset];
            this.includedSecurelyInsecureCCs = [
                ...this.payload.slice(offset + 1, offset + 1 + numCCs),
            ];
            offset += MAX_CCs;
            numCCs = this.payload[offset];
            this.includedSecurelySecureCCs = [
                ...this.payload.slice(offset + 1, offset + 1 + numCCs),
            ];
        }
        else {
            this.includedInsecurely = options.includedInsecurely;
            this.includedSecurelyInsecureCCs =
                options.includedSecurelyInsecureCCs;
            this.includedSecurelySecureCCs = options.includedSecurelySecureCCs;
        }
    }
    serialize() {
        this.payload = Buffer.alloc((1 + MAX_CCs) * 3);
        let offset = 0;
        for (const array of [
            this.includedInsecurely,
            this.includedSecurelyInsecureCCs,
            this.includedSecurelySecureCCs,
        ]) {
            this.payload[offset] = array.length;
            this.payload.set(array, offset + 1);
            offset += 1 + MAX_CCs;
        }
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            "included insecurely": this.includedInsecurely
                .map((cc) => safe_1.CommandClasses[cc])
                .join(", "),
            "included securely (insecure)": this.includedSecurelyInsecureCCs
                .map((cc) => safe_1.CommandClasses[cc])
                .join(", "),
            "included securely (secure)": this.includedSecurelySecureCCs
                .map((cc) => safe_1.CommandClasses[cc])
                .join(", "),
        };
    }
};
ApplicationCCsFile = __decorate([
    (0, NVMFile_1.nvmFileID)(103)
], ApplicationCCsFile);
exports.ApplicationCCsFile = ApplicationCCsFile;
exports.ApplicationCCsFileID = (0, NVMFile_1.getNVMFileIDStatic)(ApplicationCCsFile);
//# sourceMappingURL=ApplicationCCsFile.js.map