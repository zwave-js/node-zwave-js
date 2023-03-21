"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRC16CCCommandEncapsulation = exports.CRC16CC = exports.CRC16CCAPI = void 0;
const safe_1 = require("@zwave-js/core/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
// @noSetValueAPI
// @noInterview This CC only has a single encapsulation command
// @noValidateArgs - Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
let CRC16CCAPI = class CRC16CCAPI extends API_1.CCAPI {
    supportsCommand(_cmd) {
        // switch (cmd) {
        // 	case CRC16Command.CommandEncapsulation:
        return true; // This is mandatory
        // }
        // return super.supportsCommand(cmd);
    }
    async sendEncapsulated(encapsulatedCC) {
        this.assertSupportsCommand(_Types_1.CRC16Command, _Types_1.CRC16Command.CommandEncapsulation);
        const cc = new CRC16CCCommandEncapsulation(this.applHost, {
            nodeId: this.endpoint.nodeId,
            endpoint: this.endpoint.index,
            encapsulated: encapsulatedCC,
        });
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
};
CRC16CCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["CRC-16 Encapsulation"])
], CRC16CCAPI);
exports.CRC16CCAPI = CRC16CCAPI;
let CRC16CC = class CRC16CC extends CommandClass_1.CommandClass {
    /** Tests if a command should be supervised and thus requires encapsulation */
    static requiresEncapsulation(cc) {
        return (!!(cc.encapsulationFlags & safe_1.EncapsulationFlags.CRC16) &&
            !(cc instanceof CRC16CCCommandEncapsulation));
    }
    /** Encapsulates a command in a CRC-16 CC */
    static encapsulate(host, cc) {
        const ret = new CRC16CCCommandEncapsulation(host, {
            nodeId: cc.nodeId,
            encapsulated: cc,
        });
        // Copy the encapsulation flags from the encapsulated command
        // but omit CRC-16, since we're doing that right now
        ret.encapsulationFlags =
            cc.encapsulationFlags & ~safe_1.EncapsulationFlags.CRC16;
        return ret;
    }
};
CRC16CC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["CRC-16 Encapsulation"]),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], CRC16CC);
exports.CRC16CC = CRC16CC;
// This indirection is necessary to be able to define the same CC as the response
function getResponseForCommandEncapsulation() {
    return CRC16CCCommandEncapsulation;
}
let CRC16CCCommandEncapsulation = class CRC16CCCommandEncapsulation extends CRC16CC {
    constructor(host, options) {
        super(host, options);
        this.headerBuffer = Buffer.from([this.ccId, this.ccCommand]);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 3);
            const ccBuffer = this.payload.slice(0, -2);
            // Verify the CRC
            let expectedCRC = (0, safe_1.CRC16_CCITT)(this.headerBuffer);
            expectedCRC = (0, safe_1.CRC16_CCITT)(ccBuffer, expectedCRC);
            const actualCRC = this.payload.readUInt16BE(this.payload.length - 2);
            (0, safe_1.validatePayload)(expectedCRC === actualCRC);
            this.encapsulated = CommandClass_1.CommandClass.from(this.host, {
                data: ccBuffer,
                fromEncapsulation: true,
                encapCC: this,
                origin: options.origin,
                frameType: options.frameType,
            });
        }
        else {
            this.encapsulated = options.encapsulated;
            options.encapsulated.encapsulatingCC = this;
        }
    }
    serialize() {
        const commandBuffer = this.encapsulated.serialize();
        // Reserve 2 bytes for the CRC
        this.payload = Buffer.concat([commandBuffer, Buffer.allocUnsafe(2)]);
        // Compute and save the CRC16 in the payload
        // The CC header is included in the CRC computation
        let crc = (0, safe_1.CRC16_CCITT)(this.headerBuffer);
        crc = (0, safe_1.CRC16_CCITT)(commandBuffer, crc);
        this.payload.writeUInt16BE(crc, this.payload.length - 2);
        return super.serialize();
    }
    computeEncapsulationOverhead() {
        // CRC16 adds two bytes CRC to the default overhead
        return super.computeEncapsulationOverhead() + 2;
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            // Hide the default payload line
            message: undefined,
        };
    }
};
CRC16CCCommandEncapsulation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.CRC16Command.CommandEncapsulation),
    (0, CommandClassDecorators_1.expectedCCResponse)(getResponseForCommandEncapsulation)
], CRC16CCCommandEncapsulation);
exports.CRC16CCCommandEncapsulation = CRC16CCCommandEncapsulation;
//# sourceMappingURL=CRC16CC.js.map