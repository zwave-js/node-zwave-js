"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NVMOperationsResponse = exports.NVMOperationsWriteRequest = exports.NVMOperationsReadRequest = exports.NVMOperationsCloseRequest = exports.NVMOperationsOpenRequest = exports.NVMOperationsRequest = exports.NVMOperationStatus = exports.NVMOperationsCommand = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
var NVMOperationsCommand;
(function (NVMOperationsCommand) {
    NVMOperationsCommand[NVMOperationsCommand["Open"] = 0] = "Open";
    NVMOperationsCommand[NVMOperationsCommand["Read"] = 1] = "Read";
    NVMOperationsCommand[NVMOperationsCommand["Write"] = 2] = "Write";
    NVMOperationsCommand[NVMOperationsCommand["Close"] = 3] = "Close";
})(NVMOperationsCommand = exports.NVMOperationsCommand || (exports.NVMOperationsCommand = {}));
var NVMOperationStatus;
(function (NVMOperationStatus) {
    NVMOperationStatus[NVMOperationStatus["OK"] = 0] = "OK";
    NVMOperationStatus[NVMOperationStatus["Error"] = 1] = "Error";
    NVMOperationStatus[NVMOperationStatus["Error_OperationMismatch"] = 2] = "Error_OperationMismatch";
    NVMOperationStatus[NVMOperationStatus["Error_OperationInterference"] = 3] = "Error_OperationInterference";
    NVMOperationStatus[NVMOperationStatus["EndOfFile"] = 255] = "EndOfFile";
})(NVMOperationStatus = exports.NVMOperationStatus || (exports.NVMOperationStatus = {}));
let NVMOperationsRequest = class NVMOperationsRequest extends serial_1.Message {
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.command]),
            this.payload,
        ]);
        return super.serialize();
    }
    toLogEntry() {
        const message = {
            command: (0, shared_1.getEnumMemberName)(NVMOperationsCommand, this.command),
        };
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
NVMOperationsRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.NVMOperations),
    (0, serial_1.priority)(core_1.MessagePriority.Controller),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.NVMOperations)
], NVMOperationsRequest);
exports.NVMOperationsRequest = NVMOperationsRequest;
// =============================================================================
class NVMOperationsOpenRequest extends NVMOperationsRequest {
    constructor(host, options) {
        super(host, options);
        this.command = NVMOperationsCommand.Open;
    }
}
exports.NVMOperationsOpenRequest = NVMOperationsOpenRequest;
// =============================================================================
class NVMOperationsCloseRequest extends NVMOperationsRequest {
    constructor(host, options) {
        super(host, options);
        this.command = NVMOperationsCommand.Close;
    }
}
exports.NVMOperationsCloseRequest = NVMOperationsCloseRequest;
class NVMOperationsReadRequest extends NVMOperationsRequest {
    constructor(host, options) {
        super(host, options);
        this.command = NVMOperationsCommand.Read;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.length < 0 || options.length > 0xff) {
                throw new core_1.ZWaveError("The length must be between 0 and 255!", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (options.offset < 0 || options.offset > 0xffff) {
                throw new core_1.ZWaveError("The offset must be a 16-bit number!", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.length = options.length;
            this.offset = options.offset;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(3);
        this.payload[0] = this.length;
        this.payload.writeUInt16BE(this.offset, 1);
        return super.serialize();
    }
    toLogEntry() {
        const ret = super.toLogEntry();
        return {
            ...ret,
            message: {
                ...ret.message,
                "data length": this.length,
                "address offset": (0, shared_1.num2hex)(this.offset),
            },
        };
    }
}
exports.NVMOperationsReadRequest = NVMOperationsReadRequest;
class NVMOperationsWriteRequest extends NVMOperationsRequest {
    constructor(host, options) {
        super(host, options);
        this.command = NVMOperationsCommand.Write;
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.offset < 0 || options.offset > 0xffff) {
                throw new core_1.ZWaveError("The offset must be a 16-bit number!", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (options.buffer.length < 1 || options.buffer.length > 0xff) {
                throw new core_1.ZWaveError("The buffer must be between 1 and 255 bytes long", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.offset = options.offset;
            this.buffer = options.buffer;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(3 + this.buffer.length);
        this.payload[0] = this.buffer.length;
        this.payload.writeUInt16BE(this.offset, 1);
        this.buffer.copy(this.payload, 3);
        return super.serialize();
    }
    toLogEntry() {
        const ret = super.toLogEntry();
        return {
            ...ret,
            message: {
                ...ret.message,
                offset: (0, shared_1.num2hex)(this.offset),
                buffer: `(${this.buffer.length} byte${this.buffer.length === 1 ? "" : "s"})`,
            },
        };
    }
}
exports.NVMOperationsWriteRequest = NVMOperationsWriteRequest;
// =============================================================================
let NVMOperationsResponse = class NVMOperationsResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        (0, core_1.validatePayload)(this.payload.length >= 2);
        this.status = this.payload[0];
        if (this.payload.length >= 4) {
            this.offsetOrSize = this.payload.readUInt16BE(2);
        }
        else {
            this.offsetOrSize = 0;
        }
        const dataLength = this.payload[1];
        // The response to the write command contains the offset and written data length, but no data
        if (dataLength > 0 && this.payload.length >= 4 + dataLength) {
            this.buffer = this.payload.slice(4, 4 + dataLength);
        }
        else {
            this.buffer = Buffer.from([]);
        }
    }
    isOK() {
        return (this.status === NVMOperationStatus.OK ||
            this.status === NVMOperationStatus.EndOfFile);
    }
    toLogEntry() {
        const message = {
            status: (0, shared_1.getEnumMemberName)(NVMOperationStatus, this.status),
            "address offset / NVM size": (0, shared_1.num2hex)(this.offsetOrSize),
        };
        if (this.buffer.length > 0) {
            message.buffer = `(${this.buffer.length} byte${this.buffer.length === 1 ? "" : "s"})`;
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
NVMOperationsResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.NVMOperations)
], NVMOperationsResponse);
exports.NVMOperationsResponse = NVMOperationsResponse;
//# sourceMappingURL=NVMOperationsMessages.js.map