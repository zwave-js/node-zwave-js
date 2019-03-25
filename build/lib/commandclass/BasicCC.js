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
const Duration_1 = require("../util/Duration");
const strings_1 = require("../util/strings");
const ValueTypes_1 = require("../util/ValueTypes");
const CommandClass_1 = require("./CommandClass");
var BasicCommand;
(function (BasicCommand) {
    BasicCommand[BasicCommand["Set"] = 1] = "Set";
    BasicCommand[BasicCommand["Get"] = 2] = "Get";
    BasicCommand[BasicCommand["Report"] = 3] = "Report";
})(BasicCommand = exports.BasicCommand || (exports.BasicCommand = {}));
let BasicCC = class BasicCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, targetValue) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        if (targetValue != undefined)
            this.targetValue = targetValue;
    }
    serialize() {
        switch (this.ccCommand) {
            case BasicCommand.Get:
                this.payload = Buffer.from([this.ccCommand]);
                // no real payload
                break;
            case BasicCommand.Set:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.targetValue,
                ]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a Basic CC with a command other than Get or Set", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case BasicCommand.Report:
                this.currentValue = ValueTypes_1.parseMaybeNumber(this.payload[1]);
                // starting in V2:
                this.targetValue = ValueTypes_1.parseNumber(this.payload[2]);
                this.duration = Duration_1.Duration.parseReport(this.payload[3]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError(`Cannot deserialize a Basic CC with a command other than Report. Received ${BasicCommand[this.ccCommand]} (${strings_1.num2hex(this.ccCommand)})`, ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Object)
], BasicCC.prototype, "currentValue", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], BasicCC.prototype, "targetValue", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Duration_1.Duration)
], BasicCC.prototype, "duration", void 0);
BasicCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses.Basic),
    CommandClass_1.implementedVersion(2) // Update tests in CommandClass.test.ts when changing this
    ,
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses.Basic),
    __metadata("design:paramtypes", [Object, Number, Number, Number])
], BasicCC);
exports.BasicCC = BasicCC;
