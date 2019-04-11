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
const CommandClasses_1 = require("./CommandClasses");
var MultiCommandCommand;
(function (MultiCommandCommand) {
    MultiCommandCommand[MultiCommandCommand["CommandEncapsulation"] = 1] = "CommandEncapsulation";
})(MultiCommandCommand = exports.MultiCommandCommand || (exports.MultiCommandCommand = {}));
// TODO: Handle this command when received
let MultiCommandCC = class MultiCommandCC extends CommandClass_1.CommandClass {
    constructor(driver, nodeId, ccCommand, commands) {
        super(driver, nodeId, ccCommand);
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this.commands = commands;
    }
    // tslint:enable:unified-signatures
    serialize() {
        switch (this.ccCommand) {
            case MultiCommandCommand.CommandEncapsulation: {
                const buffers = [];
                buffers.push(Buffer.from([this.commands.length]));
                for (const cmd of this.commands) {
                    const cmdBuffer = cmd.serializeForEncapsulation();
                    buffers.push(Buffer.from([cmdBuffer.length]));
                    buffers.push(cmdBuffer);
                }
                this.payload = Buffer.concat(buffers);
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot serialize a MultiCommand CC with a command other than CommandEncapsulation", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
        return super.serialize();
    }
    deserialize(data) {
        super.deserialize(data);
        switch (this.ccCommand) {
            case MultiCommandCommand.CommandEncapsulation: {
                const numCommands = this.payload[0];
                this.commands = [];
                let offset = 0;
                for (let i = 0; i < numCommands; i++) {
                    const cmdLength = this.payload[offset];
                    this.commands.push(CommandClass_1.CommandClass.fromEncapsulated(this.driver, this, this.payload.slice(offset + 1, offset + 1 + cmdLength)));
                    offset += 1 + cmdLength;
                }
                break;
            }
            default:
                throw new ZWaveError_1.ZWaveError("Cannot deserialize a MultiCommand CC with a command other than CommandEncapsulation", ZWaveError_1.ZWaveErrorCodes.CC_Invalid);
        }
    }
};
MultiCommandCC = __decorate([
    CommandClass_1.commandClass(CommandClasses_1.CommandClasses["Multi Command"]),
    CommandClass_1.implementedVersion(1),
    CommandClass_1.expectedCCResponse(CommandClasses_1.CommandClasses["Multi Command"]),
    __metadata("design:paramtypes", [Object, Number, Number, Array])
], MultiCommandCC);
exports.MultiCommandCC = MultiCommandCC;
