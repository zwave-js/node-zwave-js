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
const Switchpoint_1 = require("../values/Switchpoint");
const CommandClass_1 = require("./CommandClass");
const CommandClasses_1 = require("./CommandClasses");
var ClimateControlScheduleCommand;
(function (ClimateControlScheduleCommand) {
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["Set"] = 1] = "Set";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["Get"] = 2] = "Get";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["Report"] = 3] = "Report";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["ChangedGet"] = 4] = "ChangedGet";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["ChangedReport"] = 5] = "ChangedReport";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["OverrideSet"] = 6] = "OverrideSet";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["OverrideGet"] = 7] = "OverrideGet";
    ClimateControlScheduleCommand[ClimateControlScheduleCommand["OverrideReport"] = 8] = "OverrideReport";
})(ClimateControlScheduleCommand = exports.ClimateControlScheduleCommand || (exports.ClimateControlScheduleCommand = {}));
var Weekday;
(function (Weekday) {
    Weekday[Weekday["Monday"] = 1] = "Monday";
    Weekday[Weekday["Tuesday"] = 2] = "Tuesday";
    Weekday[Weekday["Wednesday"] = 3] = "Wednesday";
    Weekday[Weekday["Thursday"] = 4] = "Thursday";
    Weekday[Weekday["Friday"] = 5] = "Friday";
    Weekday[Weekday["Saturday"] = 6] = "Saturday";
    Weekday[Weekday["Sunday"] = 7] = "Sunday";
})(Weekday = exports.Weekday || (exports.Weekday = {}));
var ScheduleOverrideType;
(function (ScheduleOverrideType) {
    ScheduleOverrideType[ScheduleOverrideType["None"] = 0] = "None";
    ScheduleOverrideType[ScheduleOverrideType["Temporary"] = 1] = "Temporary";
    ScheduleOverrideType[ScheduleOverrideType["Permanent"] = 2] = "Permanent";
})(ScheduleOverrideType = exports.ScheduleOverrideType || (exports.ScheduleOverrideType = {}));
let ClimateControlScheduleCC = class ClimateControlScheduleCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (this.ccCommand === ClimateControlScheduleCommand.Set) {
            [this.weekday, this.switchPoints] = args;
        }
        else if (this.ccCommand === ClimateControlScheduleCommand.Get) {
            this.weekday = args[0];
        }
        else if (this.ccCommand === ClimateControlScheduleCommand.OverrideSet) {
            [this.overrideType, this.overrideState] = args;
        }
    }
    serialize() {
        switch (this.ccCommand) {
            case ClimateControlScheduleCommand.ChangedGet:
            case ClimateControlScheduleCommand.OverrideGet:
                // no real payload
                break;
            case ClimateControlScheduleCommand.Set: {
                // Make sure we have exactly 9 entries
                const allSwitchPoints = this.switchPoints
                    ? this.switchPoints.slice(0, 9) // maximum 9
                    : [];
                while (allSwitchPoints.length < 9) {
                    allSwitchPoints.push({
                        hour: 0,
                        minute: 0,
                        state: "Unused",
                    });
                }
                this.payload = Buffer.concat([
                    Buffer.from([this.weekday & 0b111]),
                    ...allSwitchPoints.map(sp => Switchpoint_1.encodeSwitchpoint(sp)),
                ]);
                break;
            }
            case ClimateControlScheduleCommand.Get:
                this.payload = Buffer.from([this.weekday & 0b111]);
                break;
            case ClimateControlScheduleCommand.OverrideSet:
                this.payload = Buffer.from([
                    this.overrideType & 0b11,
                    SetbackState_1.encodeSetbackState(this.overrideState),
                ]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a ClimateControlSchedule CC with a command other than Get, Set, ChangedGet, OverrideGet or OverrideSet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case ClimateControlScheduleCommand.Report: {
                this.weekday = this.payload[0] & 0b111;
                const allSwitchpoints = [];
                for (let i = 0; i <= 8; i++) {
                    allSwitchpoints.push(Switchpoint_1.decodeSwitchpoint(this.payload.slice(1 + 3 * i)));
                }
                this.switchPoints = allSwitchpoints.filter(sp => sp.state !== "Unused");
                break;
            }
            case ClimateControlScheduleCommand.ChangedReport:
                this.changeCounter = this.payload[0];
                break;
            case ClimateControlScheduleCommand.OverrideReport:
                this.overrideType = this.payload[0] & 0b11;
                this.overrideState = SetbackState_1.decodeSetbackState(this.payload[1]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a ClimateControlSchedule CC with a command other than Report, ChangedReport or OverrideReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ClimateControlScheduleCC.prototype, "weekday", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Array)
], ClimateControlScheduleCC.prototype, "switchPoints", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ClimateControlScheduleCC.prototype, "overrideType", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Object)
], ClimateControlScheduleCC.prototype, "overrideState", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], ClimateControlScheduleCC.prototype, "changeCounter", void 0);
ClimateControlScheduleCC = __decorate([
    CommandClass_1.commandClass(CommandClasses_1.CommandClasses["Climate Control Schedule"]),
    CommandClass_1.implementedVersion(1),
    CommandClass_1.expectedCCResponse(CommandClasses_1.CommandClasses["Climate Control Schedule"]),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], ClimateControlScheduleCC);
exports.ClimateControlScheduleCC = ClimateControlScheduleCC;
