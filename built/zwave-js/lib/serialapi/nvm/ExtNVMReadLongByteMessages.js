"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtNVMReadLongByteResponse = exports.ExtNVMReadLongByteRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let ExtNVMReadLongByteRequest = class ExtNVMReadLongByteRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.offset < 0 || options.offset > 0xffffff) {
                throw new core_1.ZWaveError("The offset must be a 24-bit number!", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.offset = options.offset;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(3);
        this.payload.writeUIntBE(this.offset, 0, 3);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { offset: (0, shared_1.num2hex)(this.offset) },
        };
    }
};
ExtNVMReadLongByteRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.ExtNVMReadLongByte),
    (0, serial_1.priority)(core_1.MessagePriority.Controller),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.ExtNVMReadLongByte)
], ExtNVMReadLongByteRequest);
exports.ExtNVMReadLongByteRequest = ExtNVMReadLongByteRequest;
let ExtNVMReadLongByteResponse = class ExtNVMReadLongByteResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.byte = this.payload[0];
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { byte: (0, shared_1.num2hex)(this.byte) },
        };
    }
};
ExtNVMReadLongByteResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.ExtNVMReadLongByte)
], ExtNVMReadLongByteResponse);
exports.ExtNVMReadLongByteResponse = ExtNVMReadLongByteResponse;
//# sourceMappingURL=ExtNVMReadLongByteMessages.js.map