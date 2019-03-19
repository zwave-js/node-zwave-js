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
var VersionCC_1;
const SendDataMessages_1 = require("../controller/SendDataMessages");
const ZWaveLibraryTypes_1 = require("../controller/ZWaveLibraryTypes");
const ZWaveError_1 = require("../error/ZWaveError");
const CommandClass_1 = require("./CommandClass");
var VersionCommand;
(function (VersionCommand) {
    VersionCommand[VersionCommand["Get"] = 17] = "Get";
    VersionCommand[VersionCommand["Report"] = 18] = "Report";
    VersionCommand[VersionCommand["CommandClassGet"] = 19] = "CommandClassGet";
    VersionCommand[VersionCommand["CommandClassReport"] = 20] = "CommandClassReport";
})(VersionCommand = exports.VersionCommand || (exports.VersionCommand = {}));
let VersionCC = VersionCC_1 = class VersionCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, versionCommand, requestedCC) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.versionCommand = versionCommand;
        this.requestedCC = requestedCC;
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
                this.libraryType = this.payload[1];
                this.protocolVersion = `${this.payload[2]}.${this.payload[3]}`;
                this.firmwareVersions = [`${this.payload[4]}.${this.payload[5]}`];
                if (this.version >= 2) {
                    this.hardwareVersion = this.payload[6];
                    const additionalFirmwares = this.payload[7];
                    for (let i = 0; i < additionalFirmwares; i++) {
                        this.firmwareVersions.push(`${this.payload[8 + 2 * i]}.${this.payload[8 + 2 * i + 1]}`);
                    }
                }
                break;
            case VersionCommand.CommandClassReport:
                this.requestedCC = this.payload[1];
                this._ccVersion = this.payload[2];
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a Version CC with a command other than Report or CommandClassReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
    /** Requests static or dynamic state for a given from a node */
    static createStateRequest(driver, node, kind) {
        // TODO: Check if we have requested that information before and store it
        if (kind & CommandClass_1.StateKind.Static) {
            const cc = new VersionCC_1(driver, node.id, VersionCommand.Get);
            return new SendDataMessages_1.SendDataRequest(driver, cc);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], VersionCC.prototype, "libraryType", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", String)
], VersionCC.prototype, "protocolVersion", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Array)
], VersionCC.prototype, "firmwareVersions", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], VersionCC.prototype, "hardwareVersion", void 0);
VersionCC = VersionCC_1 = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses.Version),
    CommandClass_1.implementedVersion(2),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses.Version),
    __metadata("design:paramtypes", [Object, Number, Number, Number])
], VersionCC);
exports.VersionCC = VersionCC;
