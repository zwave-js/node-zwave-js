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
var ZWavePlusCommand;
(function (ZWavePlusCommand) {
    ZWavePlusCommand[ZWavePlusCommand["Get"] = 1] = "Get";
    ZWavePlusCommand[ZWavePlusCommand["Report"] = 2] = "Report";
})(ZWavePlusCommand = exports.ZWavePlusCommand || (exports.ZWavePlusCommand = {}));
var ZWavePlusRoleType;
(function (ZWavePlusRoleType) {
    ZWavePlusRoleType[ZWavePlusRoleType["CentralStaticController"] = 0] = "CentralStaticController";
    ZWavePlusRoleType[ZWavePlusRoleType["SubStaticController"] = 1] = "SubStaticController";
    ZWavePlusRoleType[ZWavePlusRoleType["PortableController"] = 2] = "PortableController";
    ZWavePlusRoleType[ZWavePlusRoleType["PortableReportingController"] = 3] = "PortableReportingController";
    ZWavePlusRoleType[ZWavePlusRoleType["PortableSlave"] = 4] = "PortableSlave";
    ZWavePlusRoleType[ZWavePlusRoleType["AlwaysOnSlave"] = 5] = "AlwaysOnSlave";
    ZWavePlusRoleType[ZWavePlusRoleType["SleepingReportingSlave"] = 6] = "SleepingReportingSlave";
    ZWavePlusRoleType[ZWavePlusRoleType["SleepingListeningSlave"] = 7] = "SleepingListeningSlave";
})(ZWavePlusRoleType = exports.ZWavePlusRoleType || (exports.ZWavePlusRoleType = {}));
var ZWavePlusNodeType;
(function (ZWavePlusNodeType) {
    ZWavePlusNodeType[ZWavePlusNodeType["Node"] = 0] = "Node";
    ZWavePlusNodeType[ZWavePlusNodeType["IPGateway"] = 2] = "IPGateway";
})(ZWavePlusNodeType = exports.ZWavePlusNodeType || (exports.ZWavePlusNodeType = {}));
let ZWavePlusCC = class ZWavePlusCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
    }
    get zwavePlusVersion() {
        return this._zwavePlusVersion;
    }
    get nodeType() {
        return this._nodeType;
    }
    get roleType() {
        return this._roleType;
    }
    get installerIcon() {
        return this._installerIcon;
    }
    get userIcon() {
        return this._userIcon;
    }
    serialize() {
        switch (this.ccCommand) {
            case ZWavePlusCommand.Get:
                this.payload = Buffer.from([this.ccCommand]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a ZWavePlus CC with a command other than Get", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case ZWavePlusCommand.Report:
                this._zwavePlusVersion = this.payload[1];
                this._roleType = this.payload[2];
                this._nodeType = this.payload[3];
                this._installerIcon = this.payload.readUInt16BE(4);
                this._userIcon = this.payload.readUInt16BE(6);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a ZWavePlus CC with a command other than Report", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
ZWavePlusCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Z-Wave Plus Info"]),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Z-Wave Plus Info"]),
    __metadata("design:paramtypes", [Object, Number, Number])
], ZWavePlusCC);
exports.ZWavePlusCC = ZWavePlusCC;
