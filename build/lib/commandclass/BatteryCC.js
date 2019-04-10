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
var BatteryCommand;
(function (BatteryCommand) {
    BatteryCommand[BatteryCommand["Get"] = 2] = "Get";
    BatteryCommand[BatteryCommand["Report"] = 3] = "Report";
})(BatteryCommand = exports.BatteryCommand || (exports.BatteryCommand = {}));
let BatteryCC = class BatteryCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
    }
    serialize() {
        switch (this.ccCommand) {
            case BatteryCommand.Get:
                // no real payload
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a Battery CC with a command other than Get", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case BatteryCommand.Report:
                this.level = this.payload[0];
                if (this.level === 0xFF) {
                    this.level = 0;
                    this.isLow = true;
                }
                else {
                    this.isLow = false;
                }
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a Battery CC with a command other than Report", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], BatteryCC.prototype, "level", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Boolean)
], BatteryCC.prototype, "isLow", void 0);
BatteryCC = __decorate([
    CommandClass_1.commandClass(CommandClasses_1.CommandClasses.Battery),
    CommandClass_1.implementedVersion(1),
    CommandClass_1.expectedCCResponse(CommandClasses_1.CommandClasses.Battery),
    __metadata("design:paramtypes", [Object, Number, Number])
], BatteryCC);
exports.BatteryCC = BatteryCC;
