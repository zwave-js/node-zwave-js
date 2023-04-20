"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationTypeFileID = exports.ApplicationTypeFile = void 0;
const NVMFile_1 = require("./NVMFile");
let ApplicationTypeFile = class ApplicationTypeFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if ((0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.isListening = !!(this.payload[0] & 0b1);
            this.optionalFunctionality = !!(this.payload[0] & 0b10);
            this.genericDeviceClass = this.payload[1];
            this.specificDeviceClass = this.payload[2];
        }
        else {
            this.isListening = options.isListening;
            this.optionalFunctionality = options.optionalFunctionality;
            this.genericDeviceClass = options.genericDeviceClass;
            this.specificDeviceClass = options.specificDeviceClass;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            (this.isListening ? 0b1 : 0) |
                (this.optionalFunctionality ? 0b10 : 0),
            this.genericDeviceClass,
            this.specificDeviceClass,
        ]);
        return super.serialize();
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    toJSON() {
        return {
            ...super.toJSON(),
            listening: this.isListening,
            "opt. functionality": this.optionalFunctionality,
            genericDeviceClass: this.genericDeviceClass,
            specificDeviceClass: this.specificDeviceClass,
        };
    }
};
ApplicationTypeFile = __decorate([
    (0, NVMFile_1.nvmFileID)(102)
], ApplicationTypeFile);
exports.ApplicationTypeFile = ApplicationTypeFile;
exports.ApplicationTypeFileID = (0, NVMFile_1.getNVMFileIDStatic)(ApplicationTypeFile);
//# sourceMappingURL=ApplicationTypeFile.js.map