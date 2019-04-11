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
const CommandClasses_1 = require("./CommandClasses");
var ManufacturerSpecificCommand;
(function (ManufacturerSpecificCommand) {
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["Get"] = 4] = "Get";
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["Report"] = 5] = "Report";
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["DeviceSpecificGet"] = 6] = "DeviceSpecificGet";
    ManufacturerSpecificCommand[ManufacturerSpecificCommand["DeviceSpecificReport"] = 7] = "DeviceSpecificReport";
})(ManufacturerSpecificCommand = exports.ManufacturerSpecificCommand || (exports.ManufacturerSpecificCommand = {}));
var DeviceIdType;
(function (DeviceIdType) {
    DeviceIdType[DeviceIdType["FactoryDefault"] = 0] = "FactoryDefault";
    DeviceIdType[DeviceIdType["SerialNumber"] = 1] = "SerialNumber";
    DeviceIdType[DeviceIdType["PseudoRandom"] = 2] = "PseudoRandom";
})(DeviceIdType = exports.DeviceIdType || (exports.DeviceIdType = {}));
let ManufacturerSpecificCC = class ManufacturerSpecificCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (ccCommand === ManufacturerSpecificCommand.DeviceSpecificGet) {
            this.deviceIdType = args[0];
        }
    }
    supportsCommand(cmd) {
        switch (cmd) {
            case ManufacturerSpecificCommand.Get:
                return true; // This is mandatory
            case ManufacturerSpecificCommand.DeviceSpecificGet:
                return this.version >= 2;
        }
        return super.supportsCommand(cmd);
    }
    serialize() {
        switch (this.ccCommand) {
            case ManufacturerSpecificCommand.Get:
                // no real payload
                break;
            case ManufacturerSpecificCommand.DeviceSpecificGet:
                this.payload = Buffer.from([(this.deviceIdType || 0) & 0b111]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a ManufacturerSpecific CC with a command other than Get or DeviceSpecificGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case ManufacturerSpecificCommand.Report:
                this.manufacturerId = this.payload.readUInt16BE(0);
                this.productType = this.payload.readUInt16BE(2);
                this.productId = this.payload.readUInt16BE(4);
                break;
            case ManufacturerSpecificCommand.DeviceSpecificReport: {
                this.deviceIdType = this.payload[0] & 0b111;
                const dataFormat = this.payload[1] >>> 5;
                const dataLength = this.payload[1] & 0b11111;
                const deviceIdData = this.payload.slice(2, 2 + dataLength);
                if (dataFormat === 0) {
                    // utf8
                    this.deviceId = deviceIdData.toString("utf8");
                }
                else {
                    this.deviceId = "0x" + deviceIdData.toString("hex");
                }
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a ManufacturerSpecific CC with a command other than Report or DeviceSpecificReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ManufacturerSpecificCC.prototype, "manufacturerId", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ManufacturerSpecificCC.prototype, "productType", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ManufacturerSpecificCC.prototype, "productId", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", String)
], ManufacturerSpecificCC.prototype, "deviceId", void 0);
ManufacturerSpecificCC = __decorate([
    CommandClass_1.commandClass(CommandClasses_1.CommandClasses["Manufacturer Specific"]),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClasses_1.CommandClasses["Manufacturer Specific"]),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], ManufacturerSpecificCC);
exports.ManufacturerSpecificCC = ManufacturerSpecificCC;
