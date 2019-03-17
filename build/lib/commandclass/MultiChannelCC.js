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
const NodeInfo_1 = require("../node/NodeInfo");
const CommandClass_1 = require("./CommandClass");
var MultiChannelCommand;
(function (MultiChannelCommand) {
    MultiChannelCommand[MultiChannelCommand["EndPointGet"] = 7] = "EndPointGet";
    MultiChannelCommand[MultiChannelCommand["EndPointReport"] = 8] = "EndPointReport";
    MultiChannelCommand[MultiChannelCommand["CapabilityGet"] = 9] = "CapabilityGet";
    MultiChannelCommand[MultiChannelCommand["CapabilityReport"] = 10] = "CapabilityReport";
    MultiChannelCommand[MultiChannelCommand["EndPointFind"] = 11] = "EndPointFind";
    MultiChannelCommand[MultiChannelCommand["EndPointFindReport"] = 12] = "EndPointFindReport";
    MultiChannelCommand[MultiChannelCommand["CommandEncapsulation"] = 13] = "CommandEncapsulation";
    // V4:
    // AggregatedMembersGet = 0x0E,
    // AggregatedMembersReport = 0x0F,
})(MultiChannelCommand = exports.MultiChannelCommand || (exports.MultiChannelCommand = {}));
let MultiChannelCC = class MultiChannelCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this._endpointCapabilities = new Map();
        if (ccCommand === MultiChannelCommand.CapabilityGet) {
            [this.endpoint] = args;
        }
        else if (ccCommand === MultiChannelCommand.EndPointFind) {
            [
                this.genericClass,
                this.specificClass,
            ] = args;
        }
    }
    get endpointCapabilities() {
        return this._endpointCapabilities;
    }
    get foundEndpoints() {
        return this._foundEndpoints;
    }
    serialize() {
        switch (this.ccCommand) {
            case MultiChannelCommand.EndPointGet:
                this.payload = Buffer.from([this.ccCommand]);
                break;
            case MultiChannelCommand.CapabilityGet:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.endpoint & 0b01111111,
                ]);
                break;
            case MultiChannelCommand.EndPointFind:
                this.payload = Buffer.from([
                    this.ccCommand,
                    this.genericClass,
                    this.specificClass,
                ]);
                break;
            // TODO: MultiChannelEncapsulation
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a MultiChannel CC with a command other than EndPointGet, CapabilityGet", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        this.ccCommand = this.payload[0];
        switch (this.ccCommand) {
            case MultiChannelCommand.EndPointReport:
                this.isDynamicEndpointCount = !!(this.payload[1] & 0b10000000);
                this.identicalCapabilities = !!(this.payload[1] & 0b01000000);
                this.endpointCount = this.payload[2] & 0b01111111;
                break;
            case MultiChannelCommand.CapabilityReport: {
                const endpointIndex = this.payload[1] & 0b01111111;
                const capability = Object.assign({ isDynamic: !!(this.payload[1] & 0b10000000) }, NodeInfo_1.parseNodeInformationFrame(this.payload.slice(2)));
                this._endpointCapabilities.set(endpointIndex, capability);
                break;
            }
            case MultiChannelCommand.EndPointFindReport: {
                const numReports = this.payload[1];
                this.genericClass = this.payload[2];
                this.specificClass = this.payload[3];
                this._foundEndpoints = [...this.payload.slice(4, 4 + numReports)].map(e => e & 0b01111111);
                break;
            }
            // TODO: MultiChannelEncapsulation
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a MultiChannel CC with a command other than EndPointReport, CapabilityReport, EndPointFindReport", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Boolean)
], MultiChannelCC.prototype, "isDynamicEndpointCount", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Boolean)
], MultiChannelCC.prototype, "identicalCapabilities", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultiChannelCC.prototype, "endpointCount", void 0);
MultiChannelCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Multi Channel"]),
    CommandClass_1.implementedVersion(3),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Multi Channel"]),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], MultiChannelCC);
exports.MultiChannelCC = MultiChannelCC;
