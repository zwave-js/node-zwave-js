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
const Message_1 = require("../message/Message");
var TransmitOptions;
(function (TransmitOptions) {
    TransmitOptions[TransmitOptions["NotSet"] = 0] = "NotSet";
    TransmitOptions[TransmitOptions["ACK"] = 1] = "ACK";
    TransmitOptions[TransmitOptions["LowPower"] = 2] = "LowPower";
    TransmitOptions[TransmitOptions["AutoRoute"] = 4] = "AutoRoute";
    TransmitOptions[TransmitOptions["NoRoute"] = 16] = "NoRoute";
    TransmitOptions[TransmitOptions["Explore"] = 32] = "Explore";
    TransmitOptions[TransmitOptions["DEFAULT"] = 37] = "DEFAULT";
})(TransmitOptions = exports.TransmitOptions || (exports.TransmitOptions = {}));
var TransmitStatus;
(function (TransmitStatus) {
    TransmitStatus[TransmitStatus["OK"] = 0] = "OK";
    TransmitStatus[TransmitStatus["NoAck"] = 1] = "NoAck";
    TransmitStatus[TransmitStatus["Fail"] = 2] = "Fail";
    TransmitStatus[TransmitStatus["NotIdle"] = 3] = "NotIdle";
    TransmitStatus[TransmitStatus["NoRoute"] = 4] = "NoRoute";
})(TransmitStatus = exports.TransmitStatus || (exports.TransmitStatus = {}));
let lastCallbackId = 0;
function getNextCallbackId() {
    lastCallbackId++;
    if (lastCallbackId > 0xff)
        lastCallbackId = 1;
    return lastCallbackId;
}
let SendDataRequest = class SendDataRequest extends Message_1.Message {
    constructor(nodeId, data, transmitOptions, callbackId) {
        super();
        this.nodeId = nodeId;
        this.data = data;
        this.transmitOptions = transmitOptions;
        this.callbackId = callbackId;
        if (nodeId != null) {
            // non-empty constructor -> define default values
            if (this.data == null)
                this.data = Buffer.from([]);
            if (this.transmitOptions == null)
                this.transmitOptions = TransmitOptions.DEFAULT;
            if (this.callbackId == null)
                this.callbackId = getNextCallbackId();
        }
    }
    // tslint:enable:unified-signatures
    serialize() {
        const ret = Buffer.allocUnsafe(this.data.length + 4);
        ret[0] = this.nodeId;
        ret[1] = this.data.length;
        this.data.copy(ret, 2);
        ret[ret.length - 2] = this.transmitOptions;
        ret[ret.length - 1] = this.callbackId;
        this.payload = ret;
        return super.serialize();
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        this.nodeId = this.payload[0];
        const dataLength = this.payload[1];
        this.data = Buffer.allocUnsafe(dataLength);
        this.payload.copy(this.data, 0, 2, 2 + dataLength);
        this.transmitOptions = this.payload[this.payload.length - 2];
        this.callbackId = this.payload[this.payload.length - 1];
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            nodeId: this.nodeId,
            transmitOptions: this.transmitOptions,
            callbackId: this.callbackId,
            data: this.data.toString("hex"),
        });
    }
};
SendDataRequest = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Request, Message_1.FunctionType.SendData),
    Message_1.expectedResponse(Message_1.FunctionType.SendData),
    Message_1.priority(Message_1.MessagePriority.Normal),
    __metadata("design:paramtypes", [Number, Buffer, Number, Number])
], SendDataRequest);
exports.SendDataRequest = SendDataRequest;
let SendDataResponse = class SendDataResponse extends Message_1.Message {
    get wasSent() {
        return this._wasSent;
    }
    get errorCode() {
        return this._errorCode;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        this._wasSent = this.payload[0] !== 0;
        if (!this._wasSent)
            this._errorCode = this.payload[0];
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            wasSent: this.wasSent,
            errorCode: this.errorCode,
        });
    }
};
SendDataResponse = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Response, Message_1.FunctionType.SendData)
], SendDataResponse);
exports.SendDataResponse = SendDataResponse;
