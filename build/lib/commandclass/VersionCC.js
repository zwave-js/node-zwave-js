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
var VersionCommand;
(function (VersionCommand) {
    VersionCommand[VersionCommand["Get"] = 17] = "Get";
    VersionCommand[VersionCommand["Report"] = 18] = "Report";
    VersionCommand[VersionCommand["CommandClassGet"] = 19] = "CommandClassGet";
    VersionCommand[VersionCommand["CommandClassReport"] = 20] = "CommandClassReport";
})(VersionCommand = exports.VersionCommand || (exports.VersionCommand = {}));
let VersionCC = class VersionCC extends CommandClass_1.CommandClass {
    constructor(nodeId, versionCommand, requestedCC) {
        super(nodeId);
        this.nodeId = nodeId;
        this.versionCommand = versionCommand;
        this.requestedCC = requestedCC;
    }
    get libraryType() {
        return this._libraryType;
    }
    get protocolVersion() {
        return this._protocolVersion;
    }
    get applicationVersion() {
        return this._applicationVersion;
    }
    get ccVersion() {
        return this._ccVersion;
    }
    serialize() {
        switch (this.versionCommand) {
            case VersionCommand.Get:
                this.payload = Buffer.from([this.versionCommand]);
                break;
            case VersionCommand.CommandClassGet:
                this.payload = Buffer.from([
                    this.versionCommand,
                    this.requestedCC,
                ]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a Version CC with a command other than Get or CommandClassGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.versionCommand = this.payload[0];
        switch (this.versionCommand) {
            case VersionCommand.Report:
                this._libraryType = this.payload[1];
                this._protocolVersion = `${this.payload[2]}.${this.payload[3]}`;
                this._applicationVersion = `${this.payload[4]}.${this.payload[5]}`;
                break;
            case VersionCommand.CommandClassReport:
                this.requestedCC = this.payload[1];
                this._ccVersion = this.payload[2];
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a Version CC with a command other than Report or CommandClassReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
VersionCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses.Version),
    CommandClass_1.implementedVersion(1),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses.Version),
    __metadata("design:paramtypes", [Number, Number, Number])
], VersionCC);
exports.VersionCC = VersionCC;
