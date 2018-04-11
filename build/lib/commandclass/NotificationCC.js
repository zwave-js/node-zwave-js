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
const object_polyfill_1 = require("../util/object-polyfill");
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
var NotificationType;
(function (NotificationType) {
    NotificationType[NotificationType["General"] = 0] = "General";
    NotificationType[NotificationType["Smoke"] = 1] = "Smoke";
    NotificationType[NotificationType["CarbonMonoxide"] = 2] = "CarbonMonoxide";
    NotificationType[NotificationType["CarbonDioxide"] = 3] = "CarbonDioxide";
    NotificationType[NotificationType["Heat"] = 4] = "Heat";
    NotificationType[NotificationType["Flood"] = 5] = "Flood";
    NotificationType[NotificationType["AccessControl"] = 6] = "AccessControl";
    NotificationType[NotificationType["Burglar"] = 7] = "Burglar";
    NotificationType[NotificationType["PowerManagement"] = 8] = "PowerManagement";
    NotificationType[NotificationType["System"] = 9] = "System";
    NotificationType[NotificationType["Emergency"] = 10] = "Emergency";
    NotificationType[NotificationType["Clock"] = 11] = "Clock";
    NotificationType[NotificationType["Appliance"] = 12] = "Appliance";
    NotificationType[NotificationType["HomeHealth"] = 13] = "HomeHealth";
})(NotificationType = exports.NotificationType || (exports.NotificationType = {}));
let NotificationCC = class NotificationCC extends CommandClass_1.CommandClass {
    constructor(nodeId, ccCommand, ...args) {
        super(nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this._supportedEvents = new Map();
        if (ccCommand === NotificationCommand.Get) {
            this.alarmType = args[0];
            this.notificationType = args[1];
            this._notificationEvent = args[2];
        }
        else if (ccCommand === NotificationCommand.Set) {
            this.notificationType = args[0];
            this.notificationStatus = args[1];
        }
    }
    get notificationEvent() {
        return this._notificationEvent;
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
    get supportedNotificationTypes() {
        return this._supportedNotificationTypes;
    }
    get supportedEvents() {
        return this._supportedEvents;
    }
    get sequenceNumber() {
        return this._sequenceNumber;
    }
    serialize() {
        switch (this.ccCommand) {
            case NotificationCommand.Get: {
                const msg = [
                    this.ccCommand,
                    this.alarmType,
                ];
                if (this.version >= 2) {
                    msg.push(this.notificationType);
                }
                if (this.version >= 3) {
                    // TODO: If the Notification Type is set to 0xFF, this field MUST be set to 0x00
                    msg.push(this.notificationEvent);
                }
                this.payload = Buffer.from(msg);
                break;
            }
            case NotificationCommand.Set:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.notificationType,
                    this.notificationStatus ? 0xff : 0x00,
                ]);
                break;
            case NotificationCommand.SupportedGet:
                this.payload = Buffer.from([this.ccCommand]);
                // no real payload
                break;
            case NotificationCommand.EventSupportedGet:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.notificationType,
                ]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a Notification CC with a command other than Get, Set, SupportedGet and EventSupportedGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
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
                // V2..V3, reserved in V4+
                this._zensorNetSourceNodeId = this.payload[3];
                // V2+
                this.notificationStatus = this.payload[4] === 0xff;
                this.notificationType = this.payload[5];
                this._notificationEvent = this.payload[6];
                const containsSeqNum = !!(this.payload[7] & 128);
                const numEventParams = this.payload[7] & 0b11111;
                if (numEventParams > 0) {
                    this._eventParameters = Buffer.from(this.payload.slice(8, 8 + numEventParams));
                }
                if (containsSeqNum) {
                    this._sequenceNumber = this.payload[8 + numEventParams];
                }
                break;
            }
            case NotificationCommand.SupportedReport: {
                this._supportsV1Alarm = !!(this.payload[1] & 128);
                const numBitMaskBytes = this.payload[1] & 31;
                // parse the bitmask into a number array
                const numTypes = numBitMaskBytes * 8 - 1;
                const notificationBitMask = this.payload.slice(2, 2 + numBitMaskBytes);
                this._supportedNotificationTypes = [];
                for (let type = 1; type <= numTypes; type++) {
                    const byteNum = type >>> 3; // type / 8
                    const bitNum = type % 8;
                    if ((notificationBitMask[byteNum] & (1 << bitNum)) !== 0)
                        this._supportedNotificationTypes.push(type);
                }
                break;
            }
            case NotificationCommand.EventSupportedReport: {
                this.notificationType = this.payload[1];
                const numBitMaskBytes = this.payload[2] & 31;
                // parse the bitmask into a number array
                const numEvents = numBitMaskBytes * 8 - 1;
                const eventsBitMask = this.payload.slice(3, 3 + numBitMaskBytes);
                const supportedEvents = this._supportedEvents.has(this.notificationType)
                    ? this._supportedEvents.get(this.notificationType)
                    : [];
                for (let event = 1; event <= numEvents; event++) {
                    const byteNum = event >>> 3; // type / 8
                    const bitNum = event % 8;
                    if ((eventsBitMask[byteNum] & (1 << bitNum)) !== 0)
                        supportedEvents.push(event);
                }
                this._supportedEvents.set(this.notificationType, supportedEvents);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a Notification CC with a command other than Report, SupportedReport, EventSupportedReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
    toJSON() {
        return super.toJSONInherited({
            ccCommand: NotificationCommand[this.ccCommand],
            alarmType: this.alarmType,
            notificationType: this.notificationType,
            notificationStatus: this.notificationStatus,
            notificationEvent: this.notificationEvent,
            alarmLevel: this.alarmLevel,
            zensorNetSourceNodeId: this.zensorNetSourceNodeId,
            eventParameters: this.eventParameters,
            supportsV1Alarm: this.supportsV1Alarm,
            supportedNotificationTypes: this.supportedNotificationTypes,
            supportedEvents: this.supportedEvents
                ? object_polyfill_1.composeObject([...this.supportedEvents.entries()].map(([type, events]) => [NotificationType[type], events]))
                : undefined,
        });
    }
};
NotificationCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses.Notification),
    CommandClass_1.implementedVersion(8),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses.Notification),
    __metadata("design:paramtypes", [Number, Number, Object])
], NotificationCC);
exports.NotificationCC = NotificationCC;
