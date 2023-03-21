"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiCommandCCCommandEncapsulation = exports.MultiCommandCC = exports.MultiCommandCCAPI = void 0;
function __assertType(argName, typeName, boundHasError) {
    const { ZWaveError, ZWaveErrorCodes } = require("@zwave-js/core");
    if (boundHasError()) {
        throw new ZWaveError(typeName ? `${argName} is not a ${typeName}` : `${argName} has the wrong type`, ZWaveErrorCodes.Argument_Invalid);
    }
}
const __assertType__sa__2_ea_2 = $o => {
    function _2($o) {
        return !($o instanceof require("../lib/CommandClass").CommandClass) ? {} : null;
    }
    function sa__2_ea_2($o) {
        if (!Array.isArray($o))
            return {};
        for (let i = 0; i < $o.length; i++) {
            const error = _2($o[i]);
            if (error)
                return error;
        }
        return null;
    }
    return sa__2_ea_2($o);
};
const safe_1 = require("@zwave-js/core/safe");
const API_1 = require("../lib/API");
const CommandClass_1 = require("../lib/CommandClass");
const CommandClassDecorators_1 = require("../lib/CommandClassDecorators");
const _Types_1 = require("../lib/_Types");
// TODO: Handle this command when received
// @noSetValueAPI This CC has no set-type commands
// @noInterview This CC only has a single encapsulation command
let MultiCommandCCAPI = class MultiCommandCCAPI extends API_1.CCAPI {
    supportsCommand(_cmd) {
        // switch (cmd) {
        // 	case MultiCommandCommand.CommandEncapsulation:
        return true; // This is mandatory
        // }
        // return super.supportsCommand(cmd);
    }
    async send(commands) {
        __assertType("commands", undefined, __assertType__sa__2_ea_2.bind(void 0, commands));
        this.assertSupportsCommand(_Types_1.MultiCommandCommand, _Types_1.MultiCommandCommand.CommandEncapsulation);
        // FIXME: This should not be on the API but rather on the applHost level
        const cc = new MultiCommandCCCommandEncapsulation(this.applHost, {
            nodeId: this.endpoint.nodeId,
            encapsulated: commands,
        });
        cc.endpointIndex = this.endpoint.index;
        await this.applHost.sendCommand(cc, this.commandOptions);
    }
};
MultiCommandCCAPI = __decorate([
    (0, CommandClassDecorators_1.API)(safe_1.CommandClasses["Multi Command"])
], MultiCommandCCAPI);
exports.MultiCommandCCAPI = MultiCommandCCAPI;
let MultiCommandCC = class MultiCommandCC extends CommandClass_1.CommandClass {
    /** Tests if a command targets a specific endpoint and thus requires encapsulation */
    static requiresEncapsulation(cc) {
        return (cc.endpointIndex !== 0 &&
            !(cc instanceof MultiCommandCCCommandEncapsulation));
    }
    static encapsulate(host, CCs) {
        const ret = new MultiCommandCCCommandEncapsulation(host, {
            nodeId: CCs[0].nodeId,
            encapsulated: CCs,
        });
        // Copy the "sum" of the encapsulation flags from the encapsulated CCs
        for (const flag of [
            safe_1.EncapsulationFlags.Supervision,
            safe_1.EncapsulationFlags.Security,
            safe_1.EncapsulationFlags.CRC16,
        ]) {
            ret.toggleEncapsulationFlag(flag, CCs.some((cc) => cc.encapsulationFlags & flag));
        }
        return ret;
    }
};
MultiCommandCC = __decorate([
    (0, CommandClassDecorators_1.commandClass)(safe_1.CommandClasses["Multi Command"]),
    (0, CommandClassDecorators_1.implementedVersion)(1)
], MultiCommandCC);
exports.MultiCommandCC = MultiCommandCC;
let MultiCommandCCCommandEncapsulation = class MultiCommandCCCommandEncapsulation extends MultiCommandCC {
    constructor(host, options) {
        super(host, options);
        if ((0, CommandClass_1.gotDeserializationOptions)(options)) {
            (0, safe_1.validatePayload)(this.payload.length >= 1);
            const numCommands = this.payload[0];
            this.encapsulated = [];
            let offset = 1;
            for (let i = 0; i < numCommands; i++) {
                (0, safe_1.validatePayload)(this.payload.length >= offset + 1);
                const cmdLength = this.payload[offset];
                (0, safe_1.validatePayload)(this.payload.length >= offset + 1 + cmdLength);
                this.encapsulated.push(CommandClass_1.CommandClass.from(this.host, {
                    data: this.payload.slice(offset + 1, offset + 1 + cmdLength),
                    fromEncapsulation: true,
                    encapCC: this,
                    origin: options.origin,
                    frameType: options.frameType,
                }));
                offset += 1 + cmdLength;
            }
        }
        else {
            this.encapsulated = options.encapsulated;
            for (const cc of options.encapsulated) {
                cc.encapsulatingCC = this;
            }
        }
    }
    serialize() {
        const buffers = [];
        buffers.push(Buffer.from([this.encapsulated.length]));
        for (const cmd of this.encapsulated) {
            const cmdBuffer = cmd.serialize();
            buffers.push(Buffer.from([cmdBuffer.length]));
            buffers.push(cmdBuffer);
        }
        this.payload = Buffer.concat(buffers);
        return super.serialize();
    }
    toLogEntry(applHost) {
        return {
            ...super.toLogEntry(applHost),
            // Hide the default payload line
            message: undefined,
        };
    }
};
MultiCommandCCCommandEncapsulation = __decorate([
    (0, CommandClassDecorators_1.CCCommand)(_Types_1.MultiCommandCommand.CommandEncapsulation)
    // When sending commands encapsulated in this CC, responses to GET-type commands likely won't be encapsulated
], MultiCommandCCCommandEncapsulation);
exports.MultiCommandCCCommandEncapsulation = MultiCommandCCCommandEncapsulation;
//# sourceMappingURL=MultiCommandCC.js.map