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
const Primitive_1 = require("../values/Primitive");
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
    MultiChannelCommand[MultiChannelCommand["AggregatedMembersGet"] = 14] = "AggregatedMembersGet";
    MultiChannelCommand[MultiChannelCommand["AggregatedMembersReport"] = 15] = "AggregatedMembersReport";
})(MultiChannelCommand = exports.MultiChannelCommand || (exports.MultiChannelCommand = {}));
let MultiChannelCC = class MultiChannelCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, ...args) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this._endpointCapabilities = new Map();
        if (ccCommand === MultiChannelCommand.CapabilityGet
            || ccCommand === MultiChannelCommand.AggregatedMembersGet) {
            this.endpoint = args[0];
        }
        else if (ccCommand === MultiChannelCommand.EndPointFind) {
            [
                this.genericClass,
                this.specificClass,
            ] = args;
        }
        else if (ccCommand === MultiChannelCommand.CommandEncapsulation) {
            this.encapsulatedCC = args[0];
        }
    }
    get endpointCapabilities() {
        return this._endpointCapabilities;
    }
    get foundEndpoints() {
        return this._foundEndpoints;
    }
    get aggregatedEndpointMembers() {
        return this._aggregatedEndpointMembers;
    }
    serialize() {
        switch (this.ccCommand) {
            case MultiChannelCommand.EndPointGet:
                // no real payload
                break;
            case MultiChannelCommand.CapabilityGet:
                this.payload = Buffer.from([this.endpoint & 0b01111111]);
                break;
            case MultiChannelCommand.EndPointFind:
                this.payload = Buffer.from([
                    this.genericClass,
                    this.specificClass,
                ]);
                break;
            case MultiChannelCommand.CommandEncapsulation: {
                const destination = typeof this.destination === "number"
                    // The destination is a single number
                    ? this.destination & 127
                    // The destination is a bit mask
                    : Primitive_1.encodeBitMask(this.destination, 7)[0] | 128;
                this.payload = Buffer.concat([
                    Buffer.from([
                        this.sourceEndPoint & 127,
                        destination,
                    ]),
                    this.encapsulatedCC.serializeForEncapsulation(),
                ]);
                break;
            }
            case MultiChannelCommand.AggregatedMembersGet:
                this.payload = Buffer.from([this.endpoint & 127]);
                break;
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a MultiChannel CC with a command other than EndPointGet, CapabilityGet, AggregatedMembersGet or CommandEncapsulation", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case MultiChannelCommand.EndPointReport:
                this.isDynamicEndpointCount = !!(this.payload[0] & 0b10000000);
                this.identicalCapabilities = !!(this.payload[0] & 0b01000000);
                this.individualEndpointCount = this.payload[1] & 0b01111111;
                if (this.version >= 4) {
                    this.aggregatedEndpointCount = this.payload[2] & 0b01111111;
                }
                break;
            case MultiChannelCommand.CapabilityReport: {
                const endpointIndex = this.payload[0] & 0b01111111;
                const capability = Object.assign({ isDynamic: !!(this.payload[0] & 0b10000000) }, NodeInfo_1.parseNodeInformationFrame(this.payload.slice(1)));
                this._endpointCapabilities.set(endpointIndex, capability);
                break;
            }
            case MultiChannelCommand.EndPointFindReport: {
                const numReports = this.payload[0];
                this.genericClass = this.payload[1];
                this.specificClass = this.payload[2];
                this._foundEndpoints = [...this.payload.slice(3, 3 + numReports)].map(e => e & 0b01111111);
                break;
            }
            case MultiChannelCommand.CommandEncapsulation: {
                this.sourceEndPoint = this.payload[0] & 127;
                const isBitMask = !!(this.payload[1] & 128);
                const destination = this.payload[1] & 127;
                if (isBitMask) {
                    this.destination = Primitive_1.parseBitMask(Buffer.from([destination]));
                }
                else {
                    this.destination = destination;
                }
                this.encapsulatedCC = CommandClass_1.CommandClass.fromEncapsulated(this.driver, this, this.payload.slice(2));
                break;
            }
            case MultiChannelCommand.AggregatedMembersReport: {
                this.endpoint = this.payload[0] & 127;
                const bitMaskLength = this.payload[1];
                const bitMask = this.payload.slice(2, 2 + bitMaskLength);
                this._aggregatedEndpointMembers = Primitive_1.parseBitMask(bitMask);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a MultiChannel CC with a command other than EndPointReport, CapabilityReport, EndPointFindReport, AggregatedMembersReport or CommandEncapsulation", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
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
], MultiChannelCC.prototype, "individualEndpointCount", void 0);
__decorate([
    CommandClass_1.ccValue(),
    __metadata("design:type", Number)
], MultiChannelCC.prototype, "aggregatedEndpointCount", void 0);
MultiChannelCC = __decorate([
    CommandClass_1.commandClass(CommandClass_1.CommandClasses["Multi Channel"]),
    CommandClass_1.implementedVersion(4),
    CommandClass_1.expectedCCResponse(CommandClass_1.CommandClasses["Multi Channel"]),
    __metadata("design:paramtypes", [Object, Number, Number, Object])
], MultiChannelCC);
exports.MultiChannelCC = MultiChannelCC;
