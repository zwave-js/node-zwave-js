"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetRFReceiveModeResponse = exports.SetRFReceiveModeRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let SetRFReceiveModeRequest = class SetRFReceiveModeRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.enabled = options.enabled;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.enabled ? 0x01 : 0x00]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                enabled: this.enabled,
            },
        };
    }
};
SetRFReceiveModeRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SetRFReceiveMode),
    (0, serial_1.priority)(core_1.MessagePriority.Controller),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.SetRFReceiveMode)
], SetRFReceiveModeRequest);
exports.SetRFReceiveModeRequest = SetRFReceiveModeRequest;
let SetRFReceiveModeResponse = class SetRFReceiveModeResponse extends serial_1.Message {
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
            message: { success: this.success },
        };
    }
};
SetRFReceiveModeResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.SetRFReceiveMode)
], SetRFReceiveModeResponse);
exports.SetRFReceiveModeResponse = SetRFReceiveModeResponse;
//# sourceMappingURL=SetRFReceiveModeMessages.js.map