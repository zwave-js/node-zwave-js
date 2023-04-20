"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtNVMWriteLongBufferResponse = exports.ExtNVMWriteLongBufferRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let ExtNVMWriteLongBufferRequest = class ExtNVMWriteLongBufferRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.offset < 0 || options.offset > 0xffffff) {
                throw new core_1.ZWaveError("The offset must be a 24-bit number!", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (options.buffer.length < 1 || options.buffer.length > 0xffff) {
                throw new core_1.ZWaveError("The buffer must be between 1 and 65535 bytes long", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.offset = options.offset;
            this.buffer = options.buffer;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(5 + this.buffer.length);
        this.payload.writeUIntBE(this.offset, 0, 3);
        this.payload.writeUInt16BE(this.buffer.length, 3);
        this.buffer.copy(this.payload, 5);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                offset: (0, shared_1.num2hex)(this.offset),
                buffer: `(${this.buffer.length} byte${this.buffer.length === 1 ? "" : "s"})`,
            },
        };
    }
};
ExtNVMWriteLongBufferRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.ExtNVMWriteLongBuffer),
    (0, serial_1.priority)(core_1.MessagePriority.Controller),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.ExtNVMWriteLongBuffer)
], ExtNVMWriteLongBufferRequest);
exports.ExtNVMWriteLongBufferRequest = ExtNVMWriteLongBufferRequest;
let ExtNVMWriteLongBufferResponse = class ExtNVMWriteLongBufferResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.success = this.payload[0] !== 0;
    }
    isOK() {
        return this.success;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                success: this.success,
            },
        };
    }
};
ExtNVMWriteLongBufferResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.ExtNVMWriteLongBuffer)
], ExtNVMWriteLongBufferResponse);
exports.ExtNVMWriteLongBufferResponse = ExtNVMWriteLongBufferResponse;
//# sourceMappingURL=ExtNVMWriteLongBufferMessages.js.map