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
const Primitive_1 = require("../values/Primitive");
const CommandClass_1 = require("./CommandClass");
var BinarySensorCommand;
(function (BinarySensorCommand) {
    BinarySensorCommand[BinarySensorCommand["Get"] = 2] = "Get";
    BinarySensorCommand[BinarySensorCommand["Report"] = 3] = "Report";
    BinarySensorCommand[BinarySensorCommand["SupportedGet"] = 1] = "SupportedGet";
    BinarySensorCommand[BinarySensorCommand["SupportedReport"] = 4] = "SupportedReport";
})(BinarySensorCommand = exports.BinarySensorCommand || (exports.BinarySensorCommand = {}));
let BinarySensorCC = class BinarySensorCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, sensorType) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (sensorType != undefined)
            this.sensorType = sensorType;
    }
    get supportedSensorTypes() {
        return this._supportedSensorTypes;
    }
    serialize() {
        switch (this.ccCommand) {
            case BinarySensorCommand.SupportedGet:
                this.payload = Buffer.from([this.ccCommand]);
                break;
            case BinarySensorCommand.Get: {
                const payload = [this.ccCommand];
                if (this.version >= 2) {
                    payload.push(this.sensorType);
                }
                this.payload = Buffer.from(payload);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a BinarySensor CC with a command other than Get or SupportedGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case BinarySensorCommand.Report:
                this.value = this.payload[1] === 0xFF;
                this.sensorType = this.payload[2];
                break;
            case BinarySensorCommand.SupportedReport: {
                // parse the bitmask into a number array
                this._supportedSensorTypes = Primitive_1.parseBitMask(this.payload.slice(1));
                // const numBitMaskBytes = this.payload.length - 1;
                // const numTypes = numBitMaskBytes * 8 - 1;
                // const sensorBitMask = this.payload.slice(1, 1 + numBitMaskBytes);
                // this._supportedSensorTypes = [];
                // for (let type = 1; type <= numTypes; type++) {
                // 	const byteNum = type >>> 3; // type / 8
                // 	const bitNum = type % 8;
                // 	if ((sensorBitMask[byteNum] & (1 << bitNum)) !== 0) this._supportedSensorTypes.push(type);
                // }
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a BinarySensor CC with a command other than Report or SupportedReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], BinarySensorCC.prototype, "sensorType", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Boolean)
], BinarySensorCC.prototype, "value", void 0);
BinarySensorCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Binary Sensor"]),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Binary Sensor"]),
    __metadata("design:paramtypes", [Object, Number, Number, Number])
], BinarySensorCC);
exports.BinarySensorCC = BinarySensorCC;
var BinarySensorType;
(function (BinarySensorType) {
    BinarySensorType[BinarySensorType["General Purpose"] = 1] = "General Purpose";
    BinarySensorType[BinarySensorType["Smoke"] = 2] = "Smoke";
    BinarySensorType[BinarySensorType["CO"] = 3] = "CO";
    BinarySensorType[BinarySensorType["CO2"] = 4] = "CO2";
    BinarySensorType[BinarySensorType["Heat"] = 5] = "Heat";
    BinarySensorType[BinarySensorType["Water"] = 6] = "Water";
    BinarySensorType[BinarySensorType["Freeze"] = 7] = "Freeze";
    BinarySensorType[BinarySensorType["Tamper"] = 8] = "Tamper";
    BinarySensorType[BinarySensorType["Aux"] = 9] = "Aux";
    BinarySensorType[BinarySensorType["Door/Window"] = 10] = "Door/Window";
    BinarySensorType[BinarySensorType["Tilt"] = 11] = "Tilt";
    BinarySensorType[BinarySensorType["Motion"] = 12] = "Motion";
    BinarySensorType[BinarySensorType["Glass Break"] = 13] = "Glass Break";
    BinarySensorType[BinarySensorType["Any"] = 255] = "Any";
})(BinarySensorType = exports.BinarySensorType || (exports.BinarySensorType = {}));
