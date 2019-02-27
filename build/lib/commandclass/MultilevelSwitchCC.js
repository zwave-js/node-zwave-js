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
const Driver_1 = require("../driver/Driver");
var MultilevelSwitchCommand;
(function (MultilevelSwitchCommand) {
    MultilevelSwitchCommand[MultilevelSwitchCommand["Set"] = 1] = "Set";
    MultilevelSwitchCommand[MultilevelSwitchCommand["Get"] = 2] = "Get";
    MultilevelSwitchCommand[MultilevelSwitchCommand["Report"] = 3] = "Report";
    MultilevelSwitchCommand[MultilevelSwitchCommand["StartLevelChange"] = 4] = "StartLevelChange";
    MultilevelSwitchCommand[MultilevelSwitchCommand["StopLevelChange"] = 5] = "StopLevelChange";
    MultilevelSwitchCommand[MultilevelSwitchCommand["SupportedGet"] = 6] = "SupportedGet";
    MultilevelSwitchCommand[MultilevelSwitchCommand["SupportedReport"] = 7] = "SupportedReport";
})(MultilevelSwitchCommand = exports.MultilevelSwitchCommand || (exports.MultilevelSwitchCommand = {}));
let MultilevelSwitchCC = class MultilevelSwitchCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (ccCommand === MultilevelSwitchCommand.Set) {
            [this.targetValue, this.duration] = args;
        }
        else if (ccCommand === MultilevelSwitchCommand.StartLevelChange) {
            [
                this.direction,
                this.ignoreStartLevel,
                this.startLevel,
                this.duration,
                this.secondarySwitchDirection,
            ] = args;
        }
    }
    get primarySwitchType() {
        return this._primarySwitchType;
    }
    get secondarySwitchType() {
        return this._secondarySwitchType;
    }
    get currentValue() {
        return this._currentValue;
    }
    serialize() {
        switch (this.ccCommand) {
            case MultilevelSwitchCommand.Set: {
                const payload = [this.ccCommand, this.targetValue];
                if (this.version >= 2) {
                    payload.push(this.duration);
                }
                this.payload = Buffer.from(payload);
                break;
            }
            case MultilevelSwitchCommand.StartLevelChange: {
                let controlByte = (LevelChangeDirection[this.direction] << 6)
                    | (this.ignoreStartLevel ? 32 : 0);
                if (this.version >= 3) {
                    if (this.secondarySwitchDirection != null) {
                        controlByte |= LevelChangeDirection[this.secondarySwitchDirection] << 3;
                    }
                }
                const payload = [
                    this.ccCommand,
                    controlByte,
                    this.startLevel,
                ];
                if (this.version >= 2) {
                    payload.push(this.duration);
                }
                if (this.version >= 3) {
                    payload.push(this.secondarySwitchStepSize);
                }
                this.payload = Buffer.from(payload);
            }
            case MultilevelSwitchCommand.Get:
            case MultilevelSwitchCommand.StopLevelChange:
            case MultilevelSwitchCommand.SupportedGet:
                // no actual payload
                this.payload = Buffer.from([this.ccCommand]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a MultilevelSwitch CC with a command other than Set, Get, StartLevelChange, StopLevelChange, SupportedGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case MultilevelSwitchCommand.Report:
                [
                    this._currentValue,
                    this.targetValue,
                    this.duration,
                ] = this.payload.slice(1);
                break;
            case MultilevelSwitchCommand.SupportedReport:
                this._primarySwitchType = this.payload[1] & 0b11111;
                this._secondarySwitchType = this.payload[2] & 0b11111;
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a MultilevelSwitch CC with a command other than Report", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
MultilevelSwitchCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Multilevel Switch"]),
    CommandClass_1.implementedVersion(4),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Multilevel Switch"]),
    __metadata("design:paramtypes", [Driver_1.Driver, Number, Number, Object])
], MultilevelSwitchCC);
exports.MultilevelSwitchCC = MultilevelSwitchCC;
var LevelChangeDirection;
(function (LevelChangeDirection) {
    LevelChangeDirection[LevelChangeDirection["up"] = 0] = "up";
    LevelChangeDirection[LevelChangeDirection["down"] = 1] = "down";
    LevelChangeDirection[LevelChangeDirection["none"] = 3] = "none";
})(LevelChangeDirection = exports.LevelChangeDirection || (exports.LevelChangeDirection = {}));
var SwitchType;
(function (SwitchType) {
    SwitchType[SwitchType["not supported"] = 0] = "not supported";
    SwitchType[SwitchType["Off/On"] = 1] = "Off/On";
    SwitchType[SwitchType["Down/Up"] = 2] = "Down/Up";
    SwitchType[SwitchType["Close/Open"] = 3] = "Close/Open";
    SwitchType[SwitchType["CCW/CW"] = 4] = "CCW/CW";
    SwitchType[SwitchType["Left/Right"] = 5] = "Left/Right";
    SwitchType[SwitchType["Reverse/Forward"] = 6] = "Reverse/Forward";
    SwitchType[SwitchType["Pull/Push"] = 7] = "Pull/Push";
})(SwitchType = exports.SwitchType || (exports.SwitchType = {}));
