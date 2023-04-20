"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetSUCNodeIdRequestStatusReport = exports.SetSUCNodeIdResponse = exports.SetSUCNodeIdRequest = exports.SetSUCNodeIdRequestBase = exports.SetSUCNodeIdStatus = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
var SetSUCNodeIdStatus;
(function (SetSUCNodeIdStatus) {
    SetSUCNodeIdStatus[SetSUCNodeIdStatus["Succeeded"] = 5] = "Succeeded";
    SetSUCNodeIdStatus[SetSUCNodeIdStatus["Failed"] = 6] = "Failed";
})(SetSUCNodeIdStatus = exports.SetSUCNodeIdStatus || (exports.SetSUCNodeIdStatus = {}));
let SetSUCNodeIdRequestBase = class SetSUCNodeIdRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== SetSUCNodeIdRequestStatusReport) {
            return new SetSUCNodeIdRequestStatusReport(host, options);
        }
        super(host, options);
    }
};
SetSUCNodeIdRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SetSUCNodeId),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], SetSUCNodeIdRequestBase);
exports.SetSUCNodeIdRequestBase = SetSUCNodeIdRequestBase;
let SetSUCNodeIdRequest = class SetSUCNodeIdRequest extends SetSUCNodeIdRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.sucNodeId = options.sucNodeId ?? host.ownNodeId;
            this.enableSUC = options.enableSUC;
            this.enableSIS = options.enableSIS;
            this.transmitOptions =
                options.transmitOptions ?? core_1.TransmitOptions.DEFAULT;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.sucNodeId,
            this.enableSUC ? 0x01 : 0x00,
            this.transmitOptions,
            this.enableSIS ? 0x01 : 0x00,
            this.callbackId,
        ]);
        return super.serialize();
    }
    expectsCallback() {
        if (this.sucNodeId === this.host.ownNodeId)
            return false;
        return super.expectsCallback();
    }
};
SetSUCNodeIdRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.SetSUCNodeId),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.SetSUCNodeId)
], SetSUCNodeIdRequest);
exports.SetSUCNodeIdRequest = SetSUCNodeIdRequest;
let SetSUCNodeIdResponse = class SetSUCNodeIdResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this._wasExecuted = this.payload[0] !== 0;
    }
    isOK() {
        return this._wasExecuted;
    }
    get wasExecuted() {
        return this._wasExecuted;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "was executed": this.wasExecuted },
        };
    }
};
SetSUCNodeIdResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.SetSUCNodeId)
], SetSUCNodeIdResponse);
exports.SetSUCNodeIdResponse = SetSUCNodeIdResponse;
class SetSUCNodeIdRequestStatusReport extends SetSUCNodeIdRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
        this._status = this.payload[1];
    }
    get status() {
        return this._status;
    }
    isOK() {
        return this._status === SetSUCNodeIdStatus.Succeeded;
    }
}
exports.SetSUCNodeIdRequestStatusReport = SetSUCNodeIdRequestStatusReport;
//# sourceMappingURL=SetSUCNodeIDMessages.js.map