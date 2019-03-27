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
var ThermostatSetpointCommand;
(function (ThermostatSetpointCommand) {
    ThermostatSetpointCommand[ThermostatSetpointCommand["Set"] = 1] = "Set";
    ThermostatSetpointCommand[ThermostatSetpointCommand["Get"] = 2] = "Get";
    ThermostatSetpointCommand[ThermostatSetpointCommand["Report"] = 3] = "Report";
    ThermostatSetpointCommand[ThermostatSetpointCommand["SupportedGet"] = 4] = "SupportedGet";
    ThermostatSetpointCommand[ThermostatSetpointCommand["SupportedReport"] = 5] = "SupportedReport";
    ThermostatSetpointCommand[ThermostatSetpointCommand["CapabilitiesGet"] = 9] = "CapabilitiesGet";
    ThermostatSetpointCommand[ThermostatSetpointCommand["CapabilitiesReport"] = 10] = "CapabilitiesReport";
})(ThermostatSetpointCommand = exports.ThermostatSetpointCommand || (exports.ThermostatSetpointCommand = {}));
var ThermostatSetpointType;
(function (ThermostatSetpointType) {
    ThermostatSetpointType[ThermostatSetpointType["N/A"] = 0] = "N/A";
    ThermostatSetpointType[ThermostatSetpointType["Heating"] = 1] = "Heating";
    ThermostatSetpointType[ThermostatSetpointType["Cooling"] = 2] = "Cooling";
    ThermostatSetpointType[ThermostatSetpointType["Furnace"] = 7] = "Furnace";
    ThermostatSetpointType[ThermostatSetpointType["Dry Air"] = 8] = "Dry Air";
    ThermostatSetpointType[ThermostatSetpointType["Moist Air"] = 9] = "Moist Air";
    ThermostatSetpointType[ThermostatSetpointType["Auto Changeover"] = 10] = "Auto Changeover";
    ThermostatSetpointType[ThermostatSetpointType["Energy Save Heating"] = 11] = "Energy Save Heating";
    ThermostatSetpointType[ThermostatSetpointType["Energy Save Cooling"] = 12] = "Energy Save Cooling";
    ThermostatSetpointType[ThermostatSetpointType["Away Heating"] = 13] = "Away Heating";
    ThermostatSetpointType[ThermostatSetpointType["Away Cooling"] = 14] = "Away Cooling";
    ThermostatSetpointType[ThermostatSetpointType["Full Power"] = 15] = "Full Power";
})(ThermostatSetpointType = exports.ThermostatSetpointType || (exports.ThermostatSetpointType = {}));
// This array is used to map the advertised supported types (interpretation A)
// to the actual enum values
const thermostatSetpointTypeMap = [
    0x00, 0x01, 0x02, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
];
var ThermostatSetpointScale;
(function (ThermostatSetpointScale) {
    ThermostatSetpointScale[ThermostatSetpointScale["Celsius"] = 0] = "Celsius";
    ThermostatSetpointScale[ThermostatSetpointScale["Fahrenheit"] = 1] = "Fahrenheit";
})(ThermostatSetpointScale = exports.ThermostatSetpointScale || (exports.ThermostatSetpointScale = {}));
let ThermostatSetpointCC = class ThermostatSetpointCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, setpointType, value) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        switch (ccCommand) {
            case ThermostatSetpointCommand.Set:
                this.value = value;
            // fallthrough
            case ThermostatSetpointCommand.Get:
            case ThermostatSetpointCommand.CapabilitiesGet:
                this.setpointType = setpointType;
                break;
        }
    }
    serialize() {
        switch (this.ccCommand) {
            case ThermostatSetpointCommand.Get:
            case ThermostatSetpointCommand.CapabilitiesGet:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.setpointType & 0b1111,
                ]);
                break;
            case ThermostatSetpointCommand.Set:
                this.payload = Buffer.concat([
                    Buffer.from([
                        this.ccCommand,
                        this.setpointType & 0b1111,
                    ]),
                    Primitive_1.encodeFloatWithScale(this.value, this.scale),
                ]);
                break;
            case ThermostatSetpointCommand.SupportedGet:
                this.payload = Buffer.from([this.ccCommand]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a ThermostatSetpoint CC with a command other than Get, Set, SupportedGet or CapabilitiesGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case ThermostatSetpointCommand.Report:
                this.setpointType = this.payload[1] & 0b1111;
                ({ value: this.value, scale: this.scale } = Primitive_1.parseFloatWithScale(this.payload.slice(2)));
                break;
            case ThermostatSetpointCommand.SupportedReport: {
                const bitMask = this.payload.slice(1);
                const supported = Primitive_1.parseBitMask(bitMask);
                if (this.version >= 3) {
                    // Interpretation A
                    this.supportedSetpointTypes = supported.map(i => thermostatSetpointTypeMap[i]);
                }
                else {
                    // TODO: Determine which interpretation the device complies to
                    this.supportedSetpointTypes = supported;
                }
                break;
                // TODO:
                // Some devices skip the gaps in the ThermostatSetpointType (Interpretation A), some don't (Interpretation B)
                // Devices with V3+ must comply with Interpretation A
                // It is RECOMMENDED that a controlling node determines supported Setpoint Types
                // by sending one Thermostat Setpoint Get Command at a time while incrementing
                // the requested Setpoint Type. If the same Setpoint Type is advertised in the
                // resulting Thermostat Setpoint Report Command, the controlling node MAY conclude
                // that the actual Setpoint Type is supported. If the Setpoint Type 0x00 (type N/A)
                // is advertised in the resulting Thermostat Setpoint Report Command, the controlling
                // node MUST conclude that the actual Setpoint Type is not supported.
            }
            case ThermostatSetpointCommand.CapabilitiesReport: {
                this.setpointType = this.payload[1];
                let bytesRead;
                ({ value: this.minValue, scale: this.minValueScale, bytesRead } = Primitive_1.parseFloatWithScale(this.payload.slice(2)));
                ({ value: this.maxValue, scale: this.maxValueScale } = Primitive_1.parseFloatWithScale(this.payload.slice(2 + bytesRead)));
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a ThermostatSetpoint CC with a command other than Report, SupportedReport or CapabilitiesReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetpointCC.prototype, "value", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetpointCC.prototype, "scale", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetpointCC.prototype, "minValue", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetpointCC.prototype, "maxValue", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetpointCC.prototype, "minValueScale", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetpointCC.prototype, "maxValueScale", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ThermostatSetpointCC.prototype, "setpointType", void 0);
ThermostatSetpointCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Thermostat Setpoint"]),
    CommandClass_1.implementedVersion(3),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Thermostat Setpoint"]),
    __metadata("design:paramtypes", [Object, Number, Number, Number, Number])
], ThermostatSetpointCC);
exports.ThermostatSetpointCC = ThermostatSetpointCC;
