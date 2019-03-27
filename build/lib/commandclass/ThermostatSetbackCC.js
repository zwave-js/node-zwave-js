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
const SetbackState_1 = require("../values/SetbackState");
const CommandClass_1 = require("./CommandClass");
var ThermostatSetbackCommand;
(function (ThermostatSetbackCommand) {
    ThermostatSetbackCommand[ThermostatSetbackCommand["Set"] = 1] = "Set";
    ThermostatSetbackCommand[ThermostatSetbackCommand["Get"] = 2] = "Get";
    ThermostatSetbackCommand[ThermostatSetbackCommand["Report"] = 3] = "Report";
})(ThermostatSetbackCommand = exports.ThermostatSetbackCommand || (exports.ThermostatSetbackCommand = {}));
var SetbackType;
(function (SetbackType) {
    SetbackType[SetbackType["None"] = 0] = "None";
    SetbackType[SetbackType["Temporary"] = 1] = "Temporary";
    SetbackType[SetbackType["Permanent"] = 2] = "Permanent";
})(SetbackType = exports.SetbackType || (exports.SetbackType = {}));
let ThermostatSetbackCC = class ThermostatSetbackCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (ccCommand === ThermostatSetbackCommand.Set) {
            [
                this.setbackType,
                this.setbackState,
            ] = args;
        }
    }
    serialize() {
        switch (this.ccCommand) {
            case ThermostatSetbackCommand.Get:
                // no real payload
                break;
            case ThermostatSetbackCommand.Set:
                this.payload = Buffer.from([
                    this.setbackType & 0b11,
                    SetbackState_1.encodeSetbackState(this.setbackState),
                ]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a ThermostatSetback CC with a command other than Set or Get", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case ThermostatSetbackCommand.Report:
                this.setbackType = this.payload[0] & 0b11;
                this.setbackState = SetbackState_1.decodeSetbackState(this.payload[1]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a ThermostatSetback CC with a command other than Report", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetbackCC.prototype, "setbackType", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Object)
], ThermostatSetbackCC.prototype, "setbackState", void 0);
ThermostatSetbackCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Thermostat Setback"]),
    CommandClass_1.implementedVersion(1),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Thermostat Setback"]),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], ThermostatSetbackCC);
exports.ThermostatSetbackCC = ThermostatSetbackCC;
