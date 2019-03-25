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
const ValueTypes_1 = require("../util/ValueTypes");
const CommandClass_1 = require("./CommandClass");
var MultilevelSensorCommand;
(function (MultilevelSensorCommand) {
    MultilevelSensorCommand[MultilevelSensorCommand["GetSupportedSensor"] = 1] = "GetSupportedSensor";
    MultilevelSensorCommand[MultilevelSensorCommand["SupportedSensorReport"] = 2] = "SupportedSensorReport";
    MultilevelSensorCommand[MultilevelSensorCommand["GetSupportedScale"] = 3] = "GetSupportedScale";
    MultilevelSensorCommand[MultilevelSensorCommand["Get"] = 4] = "Get";
    MultilevelSensorCommand[MultilevelSensorCommand["Report"] = 5] = "Report";
    MultilevelSensorCommand[MultilevelSensorCommand["SupportedScaleReport"] = 6] = "SupportedScaleReport";
})(MultilevelSensorCommand = exports.MultilevelSensorCommand || (exports.MultilevelSensorCommand = {}));
// TODO: Define sensor types and scales
let MultilevelSensorCC = class MultilevelSensorCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this._supportedScales = new Map();
        if (this.ccCommand === MultilevelSensorCommand.GetSupportedScale) {
            this.sensorType = args[0];
        }
        else if (this.ccCommand === MultilevelSensorCommand.Get) {
            [
                this.sensorType,
                this.scale,
            ] = args;
        }
    }
    get supportedSensorTypes() {
        return this._supportedSensorTypes;
    }
    get supportedScales() {
        return this._supportedScales;
    }
    serialize() {
        switch (this.ccCommand) {
            case MultilevelSensorCommand.Get:
                const payload = [this.ccCommand];
                if (this.version >= 5 && this.sensorType != undefined && this.scale != undefined) {
                    payload.push(this.sensorType, (this.scale & 0b11) << 3);
                }
                this.payload = Buffer.from(payload);
                break;
            case MultilevelSensorCommand.GetSupportedSensor:
                this.payload = Buffer.from([this.ccCommand]);
                break;
            case MultilevelSensorCommand.GetSupportedScale:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.sensorType,
                ]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a MultilevelSensor CC with a command other than Get, GetSupportedSensor or GetSupportedScale", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case MultilevelSensorCommand.Report:
                this.sensorType = this.payload[1];
                ({ value: this.value, scale: this.scale } = ValueTypes_1.parseFloatWithScale(this.payload.slice(2)));
                break;
            case MultilevelSensorCommand.SupportedSensorReport:
                this._supportedSensorTypes = ValueTypes_1.parseBitMask(this.payload.slice(1));
                break;
            case MultilevelSensorCommand.SupportedScaleReport: {
                const supportedScales = [];
                const bitMask = this.payload[2] && 0b1111;
                if (!!(bitMask & 0b1))
                    supportedScales.push(1);
                if (!!(bitMask & 0b10))
                    supportedScales.push(2);
                if (!!(bitMask & 0b100))
                    supportedScales.push(3);
                if (!!(bitMask & 0b1000))
                    supportedScales.push(4);
                this._supportedScales.set(this.payload[1], supportedScales);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a MultilevelSensor CC with a command other than Report, SupportedSensorReport or SupportedScaleReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultilevelSensorCC.prototype, "sensorType", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultilevelSensorCC.prototype, "scale", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultilevelSensorCC.prototype, "value", void 0);
MultilevelSensorCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Multilevel Sensor"]),
    CommandClass_1.implementedVersion(11),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Multilevel Sensor"]),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], MultilevelSensorCC);
exports.MultilevelSensorCC = MultilevelSensorCC;
