"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirmwareUpdateNVM_WriteResponse = exports.FirmwareUpdateNVM_WriteRequest = exports.FirmwareUpdateNVM_IsValidCRC16Response = exports.FirmwareUpdateNVM_IsValidCRC16Request = exports.FirmwareUpdateNVM_UpdateCRC16Response = exports.FirmwareUpdateNVM_UpdateCRC16Request = exports.FirmwareUpdateNVM_GetNewImageResponse = exports.FirmwareUpdateNVM_GetNewImageRequest = exports.FirmwareUpdateNVM_SetNewImageResponse = exports.FirmwareUpdateNVM_SetNewImageRequest = exports.FirmwareUpdateNVM_InitResponse = exports.FirmwareUpdateNVM_InitRequest = exports.FirmwareUpdateNVMResponse = exports.FirmwareUpdateNVMRequest = exports.FirmwareUpdateNVMCommand = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
var FirmwareUpdateNVMCommand;
(function (FirmwareUpdateNVMCommand) {
    FirmwareUpdateNVMCommand[FirmwareUpdateNVMCommand["Init"] = 0] = "Init";
    FirmwareUpdateNVMCommand[FirmwareUpdateNVMCommand["SetNewImage"] = 1] = "SetNewImage";
    FirmwareUpdateNVMCommand[FirmwareUpdateNVMCommand["GetNewImage"] = 2] = "GetNewImage";
    FirmwareUpdateNVMCommand[FirmwareUpdateNVMCommand["UpdateCRC16"] = 3] = "UpdateCRC16";
    FirmwareUpdateNVMCommand[FirmwareUpdateNVMCommand["IsValidCRC16"] = 4] = "IsValidCRC16";
    FirmwareUpdateNVMCommand[FirmwareUpdateNVMCommand["Write"] = 5] = "Write";
})(FirmwareUpdateNVMCommand = exports.FirmwareUpdateNVMCommand || (exports.FirmwareUpdateNVMCommand = {}));
// We need to define the decorators for Requests and Responses separately
const { decorator: subCommandRequest, 
// lookupConstructor: getSubCommandRequestConstructor,
lookupValue: getSubCommandForRequest, } = (0, core_1.createSimpleReflectionDecorator)({
    name: "subCommandRequest",
});
const { decorator: subCommandResponse, lookupConstructor: getSubCommandResponseConstructor, } = (0, core_1.createSimpleReflectionDecorator)({
    name: "subCommandResponse",
});
function testResponseForFirmwareUpdateNVMRequest(sent, received) {
    if (!(received instanceof FirmwareUpdateNVMResponse))
        return false;
    return sent.command === received.command;
}
let FirmwareUpdateNVMRequest = class FirmwareUpdateNVMRequest extends serial_1.Message {
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
            command: (0, shared_1.getEnumMemberName)(FirmwareUpdateNVMCommand, this.command),
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
FirmwareUpdateNVMRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.FirmwareUpdateNVM),
    (0, serial_1.priority)(core_1.MessagePriority.Controller),
    (0, serial_1.expectedResponse)(testResponseForFirmwareUpdateNVMRequest)
], FirmwareUpdateNVMRequest);
exports.FirmwareUpdateNVMRequest = FirmwareUpdateNVMRequest;
let FirmwareUpdateNVMResponse = class FirmwareUpdateNVMResponse extends serial_1.Message {
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
            command: (0, shared_1.getEnumMemberName)(FirmwareUpdateNVMCommand, this.command),
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
FirmwareUpdateNVMResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.FirmwareUpdateNVM)
], FirmwareUpdateNVMResponse);
exports.FirmwareUpdateNVMResponse = FirmwareUpdateNVMResponse;
// =============================================================================
let FirmwareUpdateNVM_InitRequest = class FirmwareUpdateNVM_InitRequest extends FirmwareUpdateNVMRequest {
};
FirmwareUpdateNVM_InitRequest = __decorate([
    subCommandRequest(FirmwareUpdateNVMCommand.Init)
], FirmwareUpdateNVM_InitRequest);
exports.FirmwareUpdateNVM_InitRequest = FirmwareUpdateNVM_InitRequest;
let FirmwareUpdateNVM_InitResponse = class FirmwareUpdateNVM_InitResponse extends FirmwareUpdateNVMResponse {
    constructor(host, options) {
        super(host, options);
        this.supported = this.payload[0] !== 0;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["FW update supported"] = this.supported;
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_InitResponse = __decorate([
    subCommandResponse(FirmwareUpdateNVMCommand.Init)
], FirmwareUpdateNVM_InitResponse);
exports.FirmwareUpdateNVM_InitResponse = FirmwareUpdateNVM_InitResponse;
let FirmwareUpdateNVM_SetNewImageRequest = class FirmwareUpdateNVM_SetNewImageRequest extends FirmwareUpdateNVMRequest {
    constructor(host, options) {
        super(host, options);
        this.command = FirmwareUpdateNVMCommand.SetNewImage;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.newImage = options.newImage;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.newImage ? 1 : 0]);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["new image"] = this.newImage;
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_SetNewImageRequest = __decorate([
    subCommandRequest(FirmwareUpdateNVMCommand.SetNewImage)
], FirmwareUpdateNVM_SetNewImageRequest);
exports.FirmwareUpdateNVM_SetNewImageRequest = FirmwareUpdateNVM_SetNewImageRequest;
let FirmwareUpdateNVM_SetNewImageResponse = class FirmwareUpdateNVM_SetNewImageResponse extends FirmwareUpdateNVMResponse {
    constructor(host, options) {
        super(host, options);
        this.changed = this.payload[0] !== 0;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.changed = this.changed;
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_SetNewImageResponse = __decorate([
    subCommandResponse(FirmwareUpdateNVMCommand.SetNewImage)
], FirmwareUpdateNVM_SetNewImageResponse);
exports.FirmwareUpdateNVM_SetNewImageResponse = FirmwareUpdateNVM_SetNewImageResponse;
// =============================================================================
let FirmwareUpdateNVM_GetNewImageRequest = class FirmwareUpdateNVM_GetNewImageRequest extends FirmwareUpdateNVMRequest {
};
FirmwareUpdateNVM_GetNewImageRequest = __decorate([
    subCommandRequest(FirmwareUpdateNVMCommand.GetNewImage)
], FirmwareUpdateNVM_GetNewImageRequest);
exports.FirmwareUpdateNVM_GetNewImageRequest = FirmwareUpdateNVM_GetNewImageRequest;
let FirmwareUpdateNVM_GetNewImageResponse = class FirmwareUpdateNVM_GetNewImageResponse extends FirmwareUpdateNVMResponse {
    constructor(host, options) {
        super(host, options);
        this.newImage = this.payload[0] !== 0;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["new image"] = this.newImage;
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_GetNewImageResponse = __decorate([
    subCommandResponse(FirmwareUpdateNVMCommand.GetNewImage)
], FirmwareUpdateNVM_GetNewImageResponse);
exports.FirmwareUpdateNVM_GetNewImageResponse = FirmwareUpdateNVM_GetNewImageResponse;
let FirmwareUpdateNVM_UpdateCRC16Request = class FirmwareUpdateNVM_UpdateCRC16Request extends FirmwareUpdateNVMRequest {
    constructor(host, options) {
        super(host, options);
        this.command = FirmwareUpdateNVMCommand.UpdateCRC16;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.crcSeed = options.crcSeed;
            this.offset = options.offset;
            this.blockLength = options.blockLength;
        }
    }
    getResponseTimeout() {
        // Computing the CRC-16 of a couple hundred KB can take a while on slow sticks
        return 30000;
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(7);
        this.payload.writeUIntBE(this.offset, 0, 3);
        this.payload.writeUInt16BE(this.blockLength, 3);
        this.payload.writeUInt16BE(this.crcSeed, 5);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.offset = (0, shared_1.num2hex)(this.offset);
        message["block length"] = this.blockLength;
        message["CRC seed"] = (0, shared_1.num2hex)(this.crcSeed);
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_UpdateCRC16Request = __decorate([
    subCommandRequest(FirmwareUpdateNVMCommand.UpdateCRC16)
], FirmwareUpdateNVM_UpdateCRC16Request);
exports.FirmwareUpdateNVM_UpdateCRC16Request = FirmwareUpdateNVM_UpdateCRC16Request;
let FirmwareUpdateNVM_UpdateCRC16Response = class FirmwareUpdateNVM_UpdateCRC16Response extends FirmwareUpdateNVMResponse {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 2);
        this.crc16 = this.payload.readUint16BE(0);
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["CRC-16"] = (0, shared_1.num2hex)(this.crc16);
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_UpdateCRC16Response = __decorate([
    subCommandResponse(FirmwareUpdateNVMCommand.UpdateCRC16)
], FirmwareUpdateNVM_UpdateCRC16Response);
exports.FirmwareUpdateNVM_UpdateCRC16Response = FirmwareUpdateNVM_UpdateCRC16Response;
// =============================================================================
let FirmwareUpdateNVM_IsValidCRC16Request = class FirmwareUpdateNVM_IsValidCRC16Request extends FirmwareUpdateNVMRequest {
    getResponseTimeout() {
        // Computing the CRC-16 of a couple hundred KB can take a while on slow sticks
        return 30000;
    }
};
FirmwareUpdateNVM_IsValidCRC16Request = __decorate([
    subCommandRequest(FirmwareUpdateNVMCommand.IsValidCRC16)
], FirmwareUpdateNVM_IsValidCRC16Request);
exports.FirmwareUpdateNVM_IsValidCRC16Request = FirmwareUpdateNVM_IsValidCRC16Request;
let FirmwareUpdateNVM_IsValidCRC16Response = class FirmwareUpdateNVM_IsValidCRC16Response extends FirmwareUpdateNVMResponse {
    constructor(host, options) {
        super(host, options);
        this.isValid = this.payload[0] !== 0;
        // There are two more bytes containing the CRC result, but we don't care about that
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message["CRC-16 valid"] = this.isValid;
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_IsValidCRC16Response = __decorate([
    subCommandResponse(FirmwareUpdateNVMCommand.IsValidCRC16)
], FirmwareUpdateNVM_IsValidCRC16Response);
exports.FirmwareUpdateNVM_IsValidCRC16Response = FirmwareUpdateNVM_IsValidCRC16Response;
let FirmwareUpdateNVM_WriteRequest = class FirmwareUpdateNVM_WriteRequest extends FirmwareUpdateNVMRequest {
    constructor(host, options) {
        super(host, options);
        this.command = FirmwareUpdateNVMCommand.Write;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.offset = options.offset;
            this.buffer = options.buffer;
        }
    }
    serialize() {
        this.payload = Buffer.concat([Buffer.allocUnsafe(5), this.buffer]);
        this.payload.writeUintBE(this.offset, 0, 3);
        this.payload.writeUInt16BE(this.buffer.length, 3);
        return super.serialize();
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.offset = (0, shared_1.num2hex)(this.offset);
        if (this.buffer.length > 0) {
            message.buffer = `(${this.buffer.length} byte${this.buffer.length === 1 ? "" : "s"})`;
        }
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_WriteRequest = __decorate([
    subCommandRequest(FirmwareUpdateNVMCommand.Write)
], FirmwareUpdateNVM_WriteRequest);
exports.FirmwareUpdateNVM_WriteRequest = FirmwareUpdateNVM_WriteRequest;
let FirmwareUpdateNVM_WriteResponse = class FirmwareUpdateNVM_WriteResponse extends FirmwareUpdateNVMResponse {
    constructor(host, options) {
        super(host, options);
        this.overwritten = this.payload[0] !== 0;
    }
    toLogEntry() {
        const ret = { ...super.toLogEntry() };
        const message = ret.message;
        message.overwritten = this.overwritten;
        delete message.payload;
        return ret;
    }
};
FirmwareUpdateNVM_WriteResponse = __decorate([
    subCommandResponse(FirmwareUpdateNVMCommand.Write)
], FirmwareUpdateNVM_WriteResponse);
exports.FirmwareUpdateNVM_WriteResponse = FirmwareUpdateNVM_WriteResponse;
//# sourceMappingURL=FirmwareUpdateNVMMessages.js.map