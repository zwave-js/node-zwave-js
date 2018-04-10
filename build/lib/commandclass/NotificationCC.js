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
var NotificationCommand;
(function (NotificationCommand) {
    // All the supported commands
    NotificationCommand[NotificationCommand["EventSupportedGet"] = 1] = "EventSupportedGet";
    NotificationCommand[NotificationCommand["EventSupportedReport"] = 2] = "EventSupportedReport";
    NotificationCommand[NotificationCommand["Get"] = 4] = "Get";
    NotificationCommand[NotificationCommand["Report"] = 5] = "Report";
    NotificationCommand[NotificationCommand["Set"] = 6] = "Set";
    NotificationCommand[NotificationCommand["SupportedGet"] = 7] = "SupportedGet";
    NotificationCommand[NotificationCommand["SupportedReport"] = 8] = "SupportedReport";
})(NotificationCommand = exports.NotificationCommand || (exports.NotificationCommand = {}));
var ZWaveAlarmType;
(function (ZWaveAlarmType) {
    ZWaveAlarmType[ZWaveAlarmType["General"] = 0] = "General";
    ZWaveAlarmType[ZWaveAlarmType["Smoke"] = 1] = "Smoke";
    ZWaveAlarmType[ZWaveAlarmType["CarbonMonoxide"] = 2] = "CarbonMonoxide";
    ZWaveAlarmType[ZWaveAlarmType["CarbonDioxide"] = 3] = "CarbonDioxide";
    ZWaveAlarmType[ZWaveAlarmType["Heat"] = 4] = "Heat";
    ZWaveAlarmType[ZWaveAlarmType["Flood"] = 5] = "Flood";
    ZWaveAlarmType[ZWaveAlarmType["AccessControl"] = 6] = "AccessControl";
    ZWaveAlarmType[ZWaveAlarmType["Burglar"] = 7] = "Burglar";
    ZWaveAlarmType[ZWaveAlarmType["PowerManagement"] = 8] = "PowerManagement";
    ZWaveAlarmType[ZWaveAlarmType["System"] = 9] = "System";
    ZWaveAlarmType[ZWaveAlarmType["Emergency"] = 10] = "Emergency";
    ZWaveAlarmType[ZWaveAlarmType["Clock"] = 11] = "Clock";
    ZWaveAlarmType[ZWaveAlarmType["Appliance"] = 12] = "Appliance";
    ZWaveAlarmType[ZWaveAlarmType["HomeHealth"] = 13] = "HomeHealth";
})(ZWaveAlarmType = exports.ZWaveAlarmType || (exports.ZWaveAlarmType = {}));
let NotificationCC = class NotificationCC extends CommandClass_1.CommandClass {
    constructor(nodeId, ccCommand, ...args) {
        super(nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (ccCommand === NotificationCommand.Get) {
            this.alarmType = args[0];
            this.zWaveAlarmType = args[1];
        }
        else if (ccCommand === NotificationCommand.Set) {
            this.zWaveAlarmType = args[0];
            this.zWaveAlarmStatus = args[1];
        }
    }
    get zWaveAlarmEvent() {
        return this._zWaveAlarmEvent;
    }
    get alarmLevel() {
        return this._alarmLevel;
    }
    get zensorNetSourceNodeId() {
        return this._zensorNetSourceNodeId;
    }
    get eventParameters() {
        return this._eventParameters;
    }
    get supportsV1Alarm() {
        return this._supportsV1Alarm;
    }
    get supportedZWaveAlarmTypes() {
        return this._supportedZWaveAlarmTypes;
    }
    serialize() {
        switch (this.ccCommand) {
            case NotificationCommand.Get:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.alarmType,
                ]);
                if (this.version >= 2) {
                    this.payload = Buffer.concat([
                        this.payload,
                        Buffer.from([this.zWaveAlarmType]),
                    ]);
                }
                break;
            case NotificationCommand.Set:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.zWaveAlarmType,
                    this.zWaveAlarmStatus,
                ]);
                break;
            case NotificationCommand.SupportedGet:
                this.payload = Buffer.from([this.ccCommand]);
                // no real payload
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a Notification CC with a command other than __TODO__", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case NotificationCommand.Report: {
                this.alarmType = this.payload[1];
                this._alarmLevel = this.payload[2];
                // starting with V2
                this._zensorNetSourceNodeId = this.payload[3];
                this.zWaveAlarmStatus = this.payload[4];
                this.zWaveAlarmType = this.payload[5];
                this._zWaveAlarmEvent = this.payload[6];
                const numEventParams = this.payload[7];
                if (numEventParams != null && numEventParams > 0) {
                    this._eventParameters = Array.from(this.payload.slice(8, 8 + numEventParams));
                }
                break;
            }
            case NotificationCommand.SupportedReport: {
                this._supportsV1Alarm = !!(this.payload[1] & 128);
                const numBitMaskBytes = this.payload[1] & 31;
                // parse the bitmask into a number array
                const numBitMasks = numBitMaskBytes * 8 - 1;
                const alarmTypeBitMask = this.payload.slice(2, 2 + numBitMaskBytes);
                this._supportedZWaveAlarmTypes = [];
                for (let type = 1; type <= numBitMasks; type++) {
                    const byteNum = type >>> 3; // type / 8
                    const bitNum = type % 8;
                    if ((alarmTypeBitMask[byteNum] & (1 << bitNum)) !== 0)
                        this._supportedZWaveAlarmTypes.push(type);
                }
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a Notification CC with a command other than TODO", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
    toJSON() {
        return super.toJSONInherited({
            ccCommand: NotificationCommand[this.ccCommand],
            alarmType: this.alarmType,
            zWaveAlarmType: this.zWaveAlarmType,
            zWaveAlarmStatus: this.zWaveAlarmStatus,
            zWaveAlarmEvent: this.zWaveAlarmEvent,
            alarmLevel: this.alarmLevel,
            zensorNetSourceNodeId: this.zensorNetSourceNodeId,
            eventParameters: this.eventParameters,
            supportsV1Alarm: this.supportsV1Alarm,
            supportedZWaveAlarmTypes: this.supportedZWaveAlarmTypes,
        });
    }
};
NotificationCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses.Notification),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses.Notification),
    __metadata("design:paramtypes", [Number, Number, Object])
], NotificationCC);
exports.NotificationCC = NotificationCC;
