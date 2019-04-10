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
const Duration_1 = require("../values/Duration");
const Primitive_1 = require("../values/Primitive");
const CommandClass_1 = require("./CommandClass");
const CommandClasses_1 = require("./CommandClasses");
var BinarySwitchCommand;
(function (BinarySwitchCommand) {
    BinarySwitchCommand[BinarySwitchCommand["Set"] = 1] = "Set";
    BinarySwitchCommand[BinarySwitchCommand["Get"] = 2] = "Get";
    BinarySwitchCommand[BinarySwitchCommand["Report"] = 3] = "Report";
})(BinarySwitchCommand = exports.BinarySwitchCommand || (exports.BinarySwitchCommand = {}));
let BinarySwitchCC = class BinarySwitchCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, targetValue, duration) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (targetValue != undefined)
            this.currentValue = targetValue;
        if (duration != undefined)
            this.duration = duration;
    }
    serialize() {
        switch (this.ccCommand) {
            case BinarySwitchCommand.Get:
                // no real payload
                break;
            case BinarySwitchCommand.Set: {
                const payload = [
                    this.targetValue ? 0xFF : 0x00,
                ];
                if (this.version >= 2) {
                    payload.push(this.duration.serializeSet());
                }
                this.payload = Buffer.from(payload);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a BinarySwitch CC with a command other than Set or Get", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case BinarySwitchCommand.Report: {
                this.currentValue = Primitive_1.parseMaybeBoolean(this.payload[0]);
                if (this.payload.length >= 2) { // V2
                    this.targetValue = Primitive_1.parseBoolean(this.payload[1]);
                    this.duration = Duration_1.Duration.parseReport(this.payload[2]);
                }
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a BinarySwitch CC with a command other than Report", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Object)
], BinarySwitchCC.prototype, "currentValue", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Boolean)
], BinarySwitchCC.prototype, "targetValue", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Duration_1.Duration)
], BinarySwitchCC.prototype, "duration", void 0);
BinarySwitchCC = __decorate([
    CommandClass_1.commandClass(CommandClasses_1.CommandClasses["Binary Switch"]),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClasses_1.CommandClasses["Binary Switch"]),
    __metadata("design:paramtypes", [Object, Number, Number, Boolean, Duration_1.Duration])
], BinarySwitchCC);
exports.BinarySwitchCC = BinarySwitchCC;
