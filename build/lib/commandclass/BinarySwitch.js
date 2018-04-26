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
var BinarySwitchCommand;
(function (BinarySwitchCommand) {
    BinarySwitchCommand[BinarySwitchCommand["Set"] = 1] = "Set";
    BinarySwitchCommand[BinarySwitchCommand["Get"] = 2] = "Get";
    BinarySwitchCommand[BinarySwitchCommand["Report"] = 3] = "Report";
})(BinarySwitchCommand = exports.BinarySwitchCommand || (exports.BinarySwitchCommand = {}));
let BinarySwitchCC = class BinarySwitchCC extends CommandClass_1.CommandClass {
    constructor(nodeId, ccCommand, targetValue, duration) {
        super(nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this.targetValue = targetValue;
        this.duration = duration;
    }
    get currentValue() {
        return this._currentValue;
    }
    serialize() {
        switch (this.ccCommand) {
            case BinarySwitchCommand.Get:
                this.payload = Buffer.from([this.ccCommand]);
                break;
            case BinarySwitchCommand.Set: {
                const payload = [
                    this.ccCommand,
                    this.targetValue ? 0xFF : 0x00,
                ];
                if (this.version >= 2) {
                    payload.push(this.duration);
                }
                this.payload = Buffer.from([this.ccCommand]);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a BinarySwitch CC with a command other than Set or Get", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case BinarySwitchCommand.Report: {
                this._currentValue = decodeBinarySwitchState(this.payload[1]);
                if (this.payload.length >= 2) { // V2
                    this.targetValue = decodeBinarySwitchState(this.payload[2]);
                    this.duration = this.payload[3];
                }
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a BinarySwitch CC with a command other than Report", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
BinarySwitchCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Binary Switch"]),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Binary Switch"]),
    __metadata("design:paramtypes", [Number, Number, Object, Number])
], BinarySwitchCC);
exports.BinarySwitchCC = BinarySwitchCC;
function decodeBinarySwitchState(val) {
    return val === 0 ? false :
        val === 0xff ? true :
            "unknown";
}
