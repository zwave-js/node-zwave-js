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
const buffers_1 = require("../util/buffers");
const CommandClass_1 = require("./CommandClass");
var WakeUpCommand;
(function (WakeUpCommand) {
    WakeUpCommand[WakeUpCommand["IntervalSet"] = 4] = "IntervalSet";
    WakeUpCommand[WakeUpCommand["IntervalGet"] = 5] = "IntervalGet";
    WakeUpCommand[WakeUpCommand["IntervalReport"] = 6] = "IntervalReport";
    WakeUpCommand[WakeUpCommand["WakeUpNotification"] = 7] = "WakeUpNotification";
    WakeUpCommand[WakeUpCommand["NoMoreInformation"] = 8] = "NoMoreInformation";
    WakeUpCommand[WakeUpCommand["IntervalCapabilitiesGet"] = 9] = "IntervalCapabilitiesGet";
    WakeUpCommand[WakeUpCommand["IntervalCapabilitiesReport"] = 10] = "IntervalCapabilitiesReport";
})(WakeUpCommand = exports.WakeUpCommand || (exports.WakeUpCommand = {}));
let WakeUpCC = class WakeUpCC extends CommandClass_1.CommandClass {
    constructor(nodeId, wakeupCommand, wakeupInterval, controllerNodeId) {
        super(nodeId);
        this.nodeId = nodeId;
        this.wakeupCommand = wakeupCommand;
        this.wakeupInterval = wakeupInterval;
        this.controllerNodeId = controllerNodeId;
    }
    get minWakeUpInterval() {
        return this._minWakeUpInterval;
    }
    get maxWakeUpInterval() {
        return this._maxWakeUpInterval;
    }
    get defaultWakeUpInterval() {
        return this._defaultWakeUpInterval;
    }
    get wakeUpIntervalSteps() {
        return this._wakeUpIntervalSteps;
    }
    serialize() {
        switch (this.wakeupCommand) {
            case WakeUpCommand.IntervalGet:
            case WakeUpCommand.NoMoreInformation:
            case WakeUpCommand.IntervalCapabilitiesGet:
                this.payload = Buffer.from([this.wakeupCommand]);
                break;
            case WakeUpCommand.IntervalSet:
                this.payload = Buffer.from([
                    this.wakeupCommand,
                    0, 0, 0,
                    this.controllerNodeId,
                ]);
                buffers_1.writeUInt24BE(this.payload, this.wakeupInterval, 1);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a WakeUp CC with a command other than IntervalSet, IntervalGet or NoMoreInformation, IntervalCapabilitiesGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.wakeupCommand = this.payload[0];
        switch (this.wakeupCommand) {
            case WakeUpCommand.IntervalReport:
                this.wakeupInterval = buffers_1.readUInt24BE(this.payload, 1);
                this.controllerNodeId = this.payload[4];
                break;
            case WakeUpCommand.WakeUpNotification:
                // no real payload
                break;
            case WakeUpCommand.IntervalCapabilitiesReport:
                this._minWakeUpInterval = buffers_1.readUInt24BE(this.payload, 1);
                this._maxWakeUpInterval = buffers_1.readUInt24BE(this.payload, 4);
                this._defaultWakeUpInterval = buffers_1.readUInt24BE(this.payload, 7);
                this._wakeUpIntervalSteps = buffers_1.readUInt24BE(this.payload, 10);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a WakeUp CC with a command other than IntervalReport or WakeUpNotification", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
WakeUpCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Wake Up"]),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Wake Up"]),
    __metadata("design:paramtypes", [Number, Number, Number, Number])
], WakeUpCC);
exports.WakeUpCC = WakeUpCC;
