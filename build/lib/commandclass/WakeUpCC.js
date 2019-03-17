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
var WakeUpCC_1;
const ZWaveError_1 = require("../error/ZWaveError");
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
function getExpectedResponseToWakeUp(sent) {
    switch (sent.wakeupCommand) {
        // These commands expect no response
        case WakeUpCommand.IntervalSet:
        case WakeUpCommand.NoMoreInformation:
            return undefined;
        // All other expect a WakeUp CC
        default: return CommandClass_1.CommandClasses["Wake Up"];
    }
}
let WakeUpCC = WakeUpCC_1 = class WakeUpCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, wakeupCommand, wakeupInterval, controllerNodeId) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.wakeupCommand = wakeupCommand;
        if (wakeupInterval != undefined)
            this.wakeupInterval = wakeupInterval;
        if (controllerNodeId != undefined)
            this.controllerNodeId = controllerNodeId;
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
                this.payload.writeUIntBE(this.wakeupInterval, 1, 3);
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
                this.wakeupInterval = this.payload.readUIntBE(1, 3);
                this.controllerNodeId = this.payload[4];
                break;
            case WakeUpCommand.WakeUpNotification:
                // no real payload
                break;
            case WakeUpCommand.IntervalCapabilitiesReport:
                this.minWakeUpInterval = this.payload.readUIntBE(1, 3);
                this.maxWakeUpInterval = this.payload.readUIntBE(4, 3);
                this.defaultWakeUpInterval = this.payload.readUIntBE(7, 3);
                this.wakeUpIntervalSteps = this.payload.readUIntBE(10, 3);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a WakeUp CC with a command other than IntervalReport or WakeUpNotification", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
    isAwake() {
        const ret = this.getValueDB().getValue(CommandClass_1.getCommandClass(this), undefined, "awake");
        // TODO: Add a way to configure this
        const assumeAwake = true;
        return ret == undefined ? assumeAwake : !!ret;
    }
    static isAwake(driver, node) {
        return new WakeUpCC_1(driver, node.id).isAwake();
    }
    setAwake(awake) {
        this.getValueDB().setValue(CommandClass_1.getCommandClass(this), undefined, "awake", awake);
    }
    static setAwake(driver, node, awake) {
        return new WakeUpCC_1(driver, node.id).setAwake(awake);
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], WakeUpCC.prototype, "wakeupInterval", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], WakeUpCC.prototype, "controllerNodeId", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], WakeUpCC.prototype, "minWakeUpInterval", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], WakeUpCC.prototype, "maxWakeUpInterval", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], WakeUpCC.prototype, "defaultWakeUpInterval", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], WakeUpCC.prototype, "wakeUpIntervalSteps", void 0);
WakeUpCC = WakeUpCC_1 = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Wake Up"]),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(getExpectedResponseToWakeUp),
    __metadata("design:paramtypes", [Object, Number, Number, Number, Number])
], WakeUpCC);
exports.WakeUpCC = WakeUpCC;
