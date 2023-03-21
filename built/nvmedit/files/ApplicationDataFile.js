"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationDataFileID = exports.ApplicationDataFile = void 0;
const NVMFile_1 = require("./NVMFile");
let ApplicationDataFile = class ApplicationDataFile extends NVMFile_1.NVMFile {
    constructor(options) {
        super(options);
        if (!(0, NVMFile_1.gotDeserializationOptions)(options)) {
            this.payload = options.data;
        }
    }
    // Just binary data
    get data() {
        return this.payload;
    }
    set data(value) {
        this.payload = value;
    }
};
ApplicationDataFile = __decorate([
    (0, NVMFile_1.nvmFileID)(200)
], ApplicationDataFile);
exports.ApplicationDataFile = ApplicationDataFile;
exports.ApplicationDataFileID = (0, NVMFile_1.getNVMFileIDStatic)(ApplicationDataFile);
//# sourceMappingURL=ApplicationDataFile.js.map