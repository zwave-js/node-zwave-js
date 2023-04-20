"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialAPISetup_GetLRMaximumPayloadSizeResponse = exports.SerialAPISetup_GetLRMaximumPayloadSizeRequest = exports.SerialAPISetup_GetMaximumPayloadSizeResponse = exports.SerialAPISetup_GetMaximumPayloadSizeRequest = exports.SerialAPISetup_SetLRMaximumTxPowerResponse = exports.SerialAPISetup_SetLRMaximumTxPowerRequest = exports.SerialAPISetup_GetLRMaximumTxPowerResponse = exports.SerialAPISetup_GetLRMaximumTxPowerRequest = exports.SerialAPISetup_SetPowerlevel16BitResponse = exports.SerialAPISetup_SetPowerlevel16BitRequest = exports.SerialAPISetup_GetPowerlevel16BitResponse = exports.SerialAPISetup_GetPowerlevel16BitRequest = exports.SerialAPISetup_SetPowerlevelResponse = exports.SerialAPISetup_SetPowerlevelRequest = exports.SerialAPISetup_GetPowerlevelResponse = exports.SerialAPISetup_GetPowerlevelRequest = exports.SerialAPISetup_SetRFRegionResponse = exports.SerialAPISetup_SetRFRegionRequest = exports.SerialAPISetup_GetRFRegionResponse = exports.SerialAPISetup_GetRFRegionRequest = exports.SerialAPISetup_SetNodeIDTypeResponse = exports.SerialAPISetup_SetNodeIDTypeRequest = exports.SerialAPISetup_SetTXStatusReportResponse = exports.SerialAPISetup_SetTXStatusReportRequest = exports.SerialAPISetup_GetSupportedCommandsResponse = exports.SerialAPISetup_GetSupportedCommandsRequest = exports.SerialAPISetup_CommandUnsupportedResponse = exports.SerialAPISetupResponse = exports.SerialAPISetupRequest = exports.SerialAPISetupCommand = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
const utils_1 = require("../../controller/utils");
const _Types_1 = require("../_Types");
var SerialAPISetupCommand;
(function (SerialAPISetupCommand) {
    SerialAPISetupCommand[SerialAPISetupCommand["Unsupported"] = 0] = "Unsupported";
    SerialAPISetupCommand[SerialAPISetupCommand["GetSupportedCommands"] = 1] = "GetSupportedCommands";
    SerialAPISetupCommand[SerialAPISetupCommand["SetTxStatusReport"] = 2] = "SetTxStatusReport";
    SerialAPISetupCommand[SerialAPISetupCommand["SetPowerlevel"] = 4] = "SetPowerlevel";
    SerialAPISetupCommand[SerialAPISetupCommand["GetPowerlevel"] = 8] = "GetPowerlevel";
    SerialAPISetupCommand[SerialAPISetupCommand["GetMaximumPayloadSize"] = 16] = "GetMaximumPayloadSize";
    SerialAPISetupCommand[SerialAPISetupCommand["GetRFRegion"] = 32] = "GetRFRegion";
    SerialAPISetupCommand[SerialAPISetupCommand["SetRFRegion"] = 64] = "SetRFRegion";
    SerialAPISetupCommand[SerialAPISetupCommand["SetNodeIDType"] = 128] = "SetNodeIDType";
    // These are added "inbetween" the existing commands
    SerialAPISetupCommand[SerialAPISetupCommand["SetLRMaximumTxPower"] = 3] = "SetLRMaximumTxPower";
    SerialAPISetupCommand[SerialAPISetupCommand["GetLRMaximumTxPower"] = 5] = "GetLRMaximumTxPower";
    SerialAPISetupCommand[SerialAPISetupCommand["GetLRMaximumPayloadSize"] = 17] = "GetLRMaximumPayloadSize";
    SerialAPISetupCommand[SerialAPISetupCommand["SetPowerlevel16Bit"] = 18] = "SetPowerlevel16Bit";
    SerialAPISetupCommand[SerialAPISetupCommand["GetPowerlevel16Bit"] = 19] = "GetPowerlevel16Bit";
})(SerialAPISetupCommand = exports.SerialAPISetupCommand || (exports.SerialAPISetupCommand = {}));
// We need to define the decorators for Requests and Responses separately
const { decorator: subCommandRequest, 
// lookupConstructor: getSubCommandRequestConstructor,
lookupValue: getSubCommandForRequest, } = (0, core_1.createSimpleReflectionDecorator)({
    name: "subCommandRequest",
});
const { decorator: subCommandResponse, lookupConstructor: getSubCommandResponseConstructor, } = (0, core_1.createSimpleReflectionDecorator)({
    name: "subCommandResponse",
});
function testResponseForSerialAPISetupRequest(sent, received) {
    if (!(received instanceof SerialAPISetupResponse))
        return false;
    return sent.command === received.command;
}
let SerialAPISetupRequest = class SerialAPISetupRequest extends serial_1.Message {
    constructor(host, options = {}) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.command = getSubCommandForRequest(this);
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.command]),
            this.payload,
        ]);
        return super.serialize();
    }
    toLogEntry() {
        const message = {
            command: (0, shared_1.getEnumMemberName)(SerialAPISetupCommand, this.command),
        };
        if (this.payload.length > 0) {
            message.payload = `0x${this.payload.toString("hex")}`;
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
SerialAPISetupRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SerialAPISetup),
    (0, serial_1.priority)(core_1.MessagePriority.Controller),
    (0, serial_1.expectedResponse)(testResponseForSerialAPISetupRequest)
], SerialAPISetupRequest);
exports.SerialAPISetupRequest = SerialAPISetupRequest;
let SerialAPISetupResponse = class SerialAPISetupResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.command = this.payload[0];
        const CommandConstructor = getSubCommandResponseConstructor(this.command);
        if (CommandConstructor && new.target !== CommandConstructor) {
            return new CommandConstructor(host, options);
        }
        this.payload = this.payload.slice(1);
    }
    toLogEntry() {
        const message = {
            command: (0, shared_1.getEnumMemberName)(SerialAPISetupCommand, this.command),
        };
        if (this.payload.length > 0) {
            message.payload = `0x${this.payload.toString("hex")}`;
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
SerialAPISetupResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.SerialAPISetup)
], SerialAPISetupResponse);
exports.SerialAPISetupResponse = SerialAPISetupResponse;
let SerialAPISetup_CommandUnsupportedResponse = class SerialAPISetup_CommandUnsupportedResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        // The payload contains which command is unsupported
        this.command = this.payload[0];
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.error = "unsupported command";
        message.command = (0, shared_1.getEnumMemberName)(SerialAPISetupCommand, this.command);
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_CommandUnsupportedResponse = __decorate([
    subCommandResponse(0x00)
], SerialAPISetup_CommandUnsupportedResponse);
exports.SerialAPISetup_CommandUnsupportedResponse = SerialAPISetup_CommandUnsupportedResponse;
// =============================================================================
let SerialAPISetup_GetSupportedCommandsRequest = class SerialAPISetup_GetSupportedCommandsRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.GetSupportedCommands;
    }
};
SerialAPISetup_GetSupportedCommandsRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.GetSupportedCommands)
], SerialAPISetup_GetSupportedCommandsRequest);
exports.SerialAPISetup_GetSupportedCommandsRequest = SerialAPISetup_GetSupportedCommandsRequest;
let SerialAPISetup_GetSupportedCommandsResponse = class SerialAPISetup_GetSupportedCommandsResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 1);
        if (this.payload.length > 1) {
            // This module supports the extended bitmask to report the supported serial API setup commands
            // Parse it as a bitmask
            this.supportedCommands = (0, core_1.parseBitMask)(this.payload.slice(1), 
            // According to the Host API specification, the first bit (bit 0) should be GetSupportedCommands
            // However, in Z-Wave SDK < 7.19.1, the entire bitmask is shifted by 1 bit and
            // GetSupportedCommands is encoded in the second bit (bit 1)
            (0, utils_1.sdkVersionLt)(options.sdkVersion, "7.19.1")
                ? SerialAPISetupCommand.Unsupported
                : SerialAPISetupCommand.GetSupportedCommands);
        }
        else {
            // This module only uses the single byte power-of-2 bitmask. Decode it manually
            this.supportedCommands = [];
            for (const cmd of [
                SerialAPISetupCommand.GetSupportedCommands,
                SerialAPISetupCommand.SetTxStatusReport,
                SerialAPISetupCommand.SetPowerlevel,
                SerialAPISetupCommand.GetPowerlevel,
                SerialAPISetupCommand.GetMaximumPayloadSize,
                SerialAPISetupCommand.GetRFRegion,
                SerialAPISetupCommand.SetRFRegion,
                SerialAPISetupCommand.SetNodeIDType,
            ]) {
                if (!!(this.payload[0] & cmd))
                    this.supportedCommands.push(cmd);
            }
        }
        // Apparently GetSupportedCommands is not always included in the bitmask, although we
        // just received a response to the command
        if (!this.supportedCommands.includes(SerialAPISetupCommand.GetSupportedCommands)) {
            this.supportedCommands.unshift(SerialAPISetupCommand.GetSupportedCommands);
        }
    }
};
SerialAPISetup_GetSupportedCommandsResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.GetSupportedCommands)
], SerialAPISetup_GetSupportedCommandsResponse);
exports.SerialAPISetup_GetSupportedCommandsResponse = SerialAPISetup_GetSupportedCommandsResponse;
let SerialAPISetup_SetTXStatusReportRequest = class SerialAPISetup_SetTXStatusReportRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.SetTxStatusReport;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.enabled = options.enabled;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.enabled ? 0xff : 0x00]);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.enabled = this.enabled;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetTXStatusReportRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.SetTxStatusReport)
], SerialAPISetup_SetTXStatusReportRequest);
exports.SerialAPISetup_SetTXStatusReportRequest = SerialAPISetup_SetTXStatusReportRequest;
let SerialAPISetup_SetTXStatusReportResponse = class SerialAPISetup_SetTXStatusReportResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.success = this.payload[0] !== 0;
    }
    isOK() {
        return this.success;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.success = this.success;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetTXStatusReportResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.SetTxStatusReport)
], SerialAPISetup_SetTXStatusReportResponse);
exports.SerialAPISetup_SetTXStatusReportResponse = SerialAPISetup_SetTXStatusReportResponse;
let SerialAPISetup_SetNodeIDTypeRequest = class SerialAPISetup_SetNodeIDTypeRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.SetNodeIDType;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.nodeIdType = options.nodeIdType;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.nodeIdType]);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["node ID type"] =
            this.nodeIdType === _Types_1.NodeIDType.Short ? "8 bit" : "16 bit";
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetNodeIDTypeRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.SetNodeIDType)
], SerialAPISetup_SetNodeIDTypeRequest);
exports.SerialAPISetup_SetNodeIDTypeRequest = SerialAPISetup_SetNodeIDTypeRequest;
let SerialAPISetup_SetNodeIDTypeResponse = class SerialAPISetup_SetNodeIDTypeResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.success = this.payload[0] !== 0;
    }
    isOK() {
        return this.success;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.success = this.success;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetNodeIDTypeResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.SetNodeIDType)
], SerialAPISetup_SetNodeIDTypeResponse);
exports.SerialAPISetup_SetNodeIDTypeResponse = SerialAPISetup_SetNodeIDTypeResponse;
// =============================================================================
let SerialAPISetup_GetRFRegionRequest = class SerialAPISetup_GetRFRegionRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.GetRFRegion;
    }
};
SerialAPISetup_GetRFRegionRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.GetRFRegion)
], SerialAPISetup_GetRFRegionRequest);
exports.SerialAPISetup_GetRFRegionRequest = SerialAPISetup_GetRFRegionRequest;
let SerialAPISetup_GetRFRegionResponse = class SerialAPISetup_GetRFRegionResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.region = this.payload[0];
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.region = (0, shared_1.getEnumMemberName)(core_1.RFRegion, this.region);
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_GetRFRegionResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.GetRFRegion)
], SerialAPISetup_GetRFRegionResponse);
exports.SerialAPISetup_GetRFRegionResponse = SerialAPISetup_GetRFRegionResponse;
let SerialAPISetup_SetRFRegionRequest = class SerialAPISetup_SetRFRegionRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.SetRFRegion;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.region = options.region;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.region]);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.region = (0, shared_1.getEnumMemberName)(core_1.RFRegion, this.region);
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetRFRegionRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.SetRFRegion)
], SerialAPISetup_SetRFRegionRequest);
exports.SerialAPISetup_SetRFRegionRequest = SerialAPISetup_SetRFRegionRequest;
let SerialAPISetup_SetRFRegionResponse = class SerialAPISetup_SetRFRegionResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.success = this.payload[0] !== 0;
    }
    isOK() {
        return this.success;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.success = this.success;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetRFRegionResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.SetRFRegion)
], SerialAPISetup_SetRFRegionResponse);
exports.SerialAPISetup_SetRFRegionResponse = SerialAPISetup_SetRFRegionResponse;
// =============================================================================
let SerialAPISetup_GetPowerlevelRequest = class SerialAPISetup_GetPowerlevelRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.GetPowerlevel;
    }
};
SerialAPISetup_GetPowerlevelRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.GetPowerlevel)
], SerialAPISetup_GetPowerlevelRequest);
exports.SerialAPISetup_GetPowerlevelRequest = SerialAPISetup_GetPowerlevelRequest;
let SerialAPISetup_GetPowerlevelResponse = class SerialAPISetup_GetPowerlevelResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 2);
        // The values are in 0.1 dBm, signed
        this.powerlevel = this.payload.readInt8(0) / 10;
        this.measured0dBm = this.payload.readInt8(1) / 10;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = {
            ...ret.message,
            "normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
            "output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
        };
        delete message.payload;
        ret.message = message;
        return ret;
    }
};
SerialAPISetup_GetPowerlevelResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.GetPowerlevel)
], SerialAPISetup_GetPowerlevelResponse);
exports.SerialAPISetup_GetPowerlevelResponse = SerialAPISetup_GetPowerlevelResponse;
let SerialAPISetup_SetPowerlevelRequest = class SerialAPISetup_SetPowerlevelRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.SetPowerlevel;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.powerlevel < -12.8 || options.powerlevel > 12.7) {
                throw new core_1.ZWaveError(`The normal powerlevel must be between -12.8 and +12.7 dBm`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (options.measured0dBm < -12.8 || options.measured0dBm > 12.7) {
                throw new core_1.ZWaveError(`The measured output power at 0 dBm must be between -12.8 and +12.7 dBm`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.powerlevel = options.powerlevel;
            this.measured0dBm = options.measured0dBm;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(2);
        // The values are in 0.1 dBm
        this.payload.writeInt8(Math.round(this.powerlevel * 10), 0);
        this.payload.writeInt8(Math.round(this.measured0dBm * 10), 1);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = {
            ...ret.message,
            "normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
            "output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
        };
        delete message.payload;
        ret.message = message;
        return ret;
    }
};
SerialAPISetup_SetPowerlevelRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.SetPowerlevel)
], SerialAPISetup_SetPowerlevelRequest);
exports.SerialAPISetup_SetPowerlevelRequest = SerialAPISetup_SetPowerlevelRequest;
let SerialAPISetup_SetPowerlevelResponse = class SerialAPISetup_SetPowerlevelResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.success = this.payload[0] !== 0;
    }
    isOK() {
        return this.success;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.success = this.success;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetPowerlevelResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.SetPowerlevel)
], SerialAPISetup_SetPowerlevelResponse);
exports.SerialAPISetup_SetPowerlevelResponse = SerialAPISetup_SetPowerlevelResponse;
// =============================================================================
let SerialAPISetup_GetPowerlevel16BitRequest = class SerialAPISetup_GetPowerlevel16BitRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.GetPowerlevel16Bit;
    }
};
SerialAPISetup_GetPowerlevel16BitRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.GetPowerlevel16Bit)
], SerialAPISetup_GetPowerlevel16BitRequest);
exports.SerialAPISetup_GetPowerlevel16BitRequest = SerialAPISetup_GetPowerlevel16BitRequest;
let SerialAPISetup_GetPowerlevel16BitResponse = class SerialAPISetup_GetPowerlevel16BitResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 4);
        // The values are in 0.1 dBm, signed
        this.powerlevel = this.payload.readInt16BE(0) / 10;
        this.measured0dBm = this.payload.readInt16BE(2) / 10;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = {
            ...ret.message,
            "normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
            "output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
        };
        delete message.payload;
        ret.message = message;
        return ret;
    }
};
SerialAPISetup_GetPowerlevel16BitResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.GetPowerlevel16Bit)
], SerialAPISetup_GetPowerlevel16BitResponse);
exports.SerialAPISetup_GetPowerlevel16BitResponse = SerialAPISetup_GetPowerlevel16BitResponse;
let SerialAPISetup_SetPowerlevel16BitRequest = class SerialAPISetup_SetPowerlevel16BitRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.SetPowerlevel16Bit;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.powerlevel < -10 || options.powerlevel > 20) {
                throw new core_1.ZWaveError(`The normal powerlevel must be between -10.0 and +20.0 dBm`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (options.measured0dBm < -10 || options.measured0dBm > 10) {
                throw new core_1.ZWaveError(`The measured output power at 0 dBm must be between -10.0 and +10.0 dBm`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.powerlevel = options.powerlevel;
            this.measured0dBm = options.measured0dBm;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(4);
        // The values are in 0.1 dBm
        this.payload.writeInt16BE(Math.round(this.powerlevel * 10), 0);
        this.payload.writeInt16BE(Math.round(this.measured0dBm * 10), 2);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = {
            ...ret.message,
            "normal powerlevel": `${this.powerlevel.toFixed(1)} dBm`,
            "output power at 0 dBm": `${this.measured0dBm.toFixed(1)} dBm`,
        };
        delete message.payload;
        ret.message = message;
        return ret;
    }
};
SerialAPISetup_SetPowerlevel16BitRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.SetPowerlevel16Bit)
], SerialAPISetup_SetPowerlevel16BitRequest);
exports.SerialAPISetup_SetPowerlevel16BitRequest = SerialAPISetup_SetPowerlevel16BitRequest;
let SerialAPISetup_SetPowerlevel16BitResponse = class SerialAPISetup_SetPowerlevel16BitResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.success = this.payload[0] !== 0;
    }
    isOK() {
        return this.success;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.success = this.success;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetPowerlevel16BitResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.SetPowerlevel16Bit)
], SerialAPISetup_SetPowerlevel16BitResponse);
exports.SerialAPISetup_SetPowerlevel16BitResponse = SerialAPISetup_SetPowerlevel16BitResponse;
// =============================================================================
let SerialAPISetup_GetLRMaximumTxPowerRequest = class SerialAPISetup_GetLRMaximumTxPowerRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.GetLRMaximumTxPower;
    }
};
SerialAPISetup_GetLRMaximumTxPowerRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.GetLRMaximumTxPower)
], SerialAPISetup_GetLRMaximumTxPowerRequest);
exports.SerialAPISetup_GetLRMaximumTxPowerRequest = SerialAPISetup_GetLRMaximumTxPowerRequest;
let SerialAPISetup_GetLRMaximumTxPowerResponse = class SerialAPISetup_GetLRMaximumTxPowerResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 2);
        // The values are in 0.1 dBm, signed
        this.limit = this.payload.readInt16BE(0) / 10;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = {
            ...ret.message,
            "max. TX power (LR)": `${this.limit.toFixed(1)} dBm`,
        };
        delete message.payload;
        ret.message = message;
        return ret;
    }
};
SerialAPISetup_GetLRMaximumTxPowerResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.GetLRMaximumTxPower)
], SerialAPISetup_GetLRMaximumTxPowerResponse);
exports.SerialAPISetup_GetLRMaximumTxPowerResponse = SerialAPISetup_GetLRMaximumTxPowerResponse;
let SerialAPISetup_SetLRMaximumTxPowerRequest = class SerialAPISetup_SetLRMaximumTxPowerRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.SetLRMaximumTxPower;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.limit < -10 || options.limit > 20) {
                throw new core_1.ZWaveError(`The maximum LR TX power must be between -10.0 and +20.0 dBm`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.limit = options.limit;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(2);
        // The values are in 0.1 dBm
        this.payload.writeInt16BE(Math.round(this.limit * 10), 0);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = {
            ...ret.message,
            "max. TX power (LR)": `${this.limit.toFixed(1)} dBm`,
        };
        delete message.payload;
        ret.message = message;
        return ret;
    }
};
SerialAPISetup_SetLRMaximumTxPowerRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.SetLRMaximumTxPower)
], SerialAPISetup_SetLRMaximumTxPowerRequest);
exports.SerialAPISetup_SetLRMaximumTxPowerRequest = SerialAPISetup_SetLRMaximumTxPowerRequest;
let SerialAPISetup_SetLRMaximumTxPowerResponse = class SerialAPISetup_SetLRMaximumTxPowerResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.success = this.payload[0] !== 0;
    }
    isOK() {
        return this.success;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.success = this.success;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_SetLRMaximumTxPowerResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.SetLRMaximumTxPower)
], SerialAPISetup_SetLRMaximumTxPowerResponse);
exports.SerialAPISetup_SetLRMaximumTxPowerResponse = SerialAPISetup_SetLRMaximumTxPowerResponse;
// =============================================================================
let SerialAPISetup_GetMaximumPayloadSizeRequest = class SerialAPISetup_GetMaximumPayloadSizeRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.GetMaximumPayloadSize;
    }
};
SerialAPISetup_GetMaximumPayloadSizeRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.GetMaximumPayloadSize)
], SerialAPISetup_GetMaximumPayloadSizeRequest);
exports.SerialAPISetup_GetMaximumPayloadSizeRequest = SerialAPISetup_GetMaximumPayloadSizeRequest;
let SerialAPISetup_GetMaximumPayloadSizeResponse = class SerialAPISetup_GetMaximumPayloadSizeResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.maxPayloadSize = this.payload[0];
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["maximum payload size"] = `${this.maxPayloadSize} bytes`;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_GetMaximumPayloadSizeResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.GetMaximumPayloadSize)
], SerialAPISetup_GetMaximumPayloadSizeResponse);
exports.SerialAPISetup_GetMaximumPayloadSizeResponse = SerialAPISetup_GetMaximumPayloadSizeResponse;
// =============================================================================
let SerialAPISetup_GetLRMaximumPayloadSizeRequest = class SerialAPISetup_GetLRMaximumPayloadSizeRequest extends SerialAPISetupRequest {
    constructor(host, options) {
        super(host, options);
        this.command = SerialAPISetupCommand.GetLRMaximumPayloadSize;
    }
};
SerialAPISetup_GetLRMaximumPayloadSizeRequest = __decorate([
    subCommandRequest(SerialAPISetupCommand.GetLRMaximumPayloadSize)
], SerialAPISetup_GetLRMaximumPayloadSizeRequest);
exports.SerialAPISetup_GetLRMaximumPayloadSizeRequest = SerialAPISetup_GetLRMaximumPayloadSizeRequest;
let SerialAPISetup_GetLRMaximumPayloadSizeResponse = class SerialAPISetup_GetLRMaximumPayloadSizeResponse extends SerialAPISetupResponse {
    constructor(host, options) {
        super(host, options);
        this.maxPayloadSize = this.payload[0];
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["maximum payload size"] = `${this.maxPayloadSize} bytes`;
        delete message.payload;
        return ret;
    }
};
SerialAPISetup_GetLRMaximumPayloadSizeResponse = __decorate([
    subCommandResponse(SerialAPISetupCommand.GetLRMaximumPayloadSize)
], SerialAPISetup_GetLRMaximumPayloadSizeResponse);
exports.SerialAPISetup_GetLRMaximumPayloadSizeResponse = SerialAPISetup_GetLRMaximumPayloadSizeResponse;
//# sourceMappingURL=SerialAPISetupMessages.js.map