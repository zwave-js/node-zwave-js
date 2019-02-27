"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const ZWaveError_1 = require("../error/ZWaveError");
const CommandClass_1 = require("./CommandClass");
var ManufacturerSpecificCommand;
(function (ManufacturerSpecificCommand) {
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["Get"] = 4] = "Get";
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["Report"] = 5] = "Report";
})(ManufacturerSpecificCommand = exports.ManufacturerSpecificCommand || (exports.ManufacturerSpecificCommand = {}));
let ManufacturerSpecificCC = class ManufacturerSpecificCC extends CommandClass_1.CommandClass {
    constructor(nodeId, ccCommand, ...args) {
        super(nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
    }
    get manufacturerId() {
        return this._manufacturerId;
    }
    get productType() {
        return this._productType;
    }
    get productId() {
        return this._productId;
    }
    serialize() {
        switch (this.ccCommand) {
            case ManufacturerSpecificCommand.Get:
                this.payload = Buffer.from([this.ccCommand]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a ManufacturerSpecific CC with a command other than Get", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case ManufacturerSpecificCommand.Report:
                this._manufacturerId = this.payload.readUInt16BE(1);
                this._productType = this.payload.readUInt16BE(3);
                this._productId = this.payload.readUInt16BE(5);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a ManufacturerSpecific CC with a command other than Report", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
ManufacturerSpecificCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Manufacturer Specific"]),
    CommandClass_1.implementedVersion(1),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Manufacturer Specific"]),
    __metadata("design:paramtypes", [Number, Number, Object])
], ManufacturerSpecificCC);
exports.ManufacturerSpecificCC = ManufacturerSpecificCC;
