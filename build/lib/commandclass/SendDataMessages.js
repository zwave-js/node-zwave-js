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
const ZWaveError_1 = require("../error/ZWaveError");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
const CommandClass_1 = require("./CommandClass");
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
// TODO: what is this?
var TransmitStatus;
(function (TransmitStatus) {
    TransmitStatus[TransmitStatus["OK"] = 0] = "OK";
    TransmitStatus[TransmitStatus["NoAck"] = 1] = "NoAck";
    TransmitStatus[TransmitStatus["Fail"] = 2] = "Fail";
    TransmitStatus[TransmitStatus["NotIdle"] = 3] = "NotIdle";
    TransmitStatus[TransmitStatus["NoRoute"] = 4] = "NoRoute";
})(TransmitStatus = exports.TransmitStatus || (exports.TransmitStatus = {}));
let lastCallbackId = 0xff;
function getNextCallbackId() {
    lastCallbackId = (lastCallbackId + 1) & 0xff;
    // callback IDs below 10 are reserved for nonce messages
    if (lastCallbackId < 10)
        lastCallbackId = 10;
    return lastCallbackId;
}
// SendDataRequests need specialized handling for the responses
// We might receive a SendDataResponse indicating that the request failed
// or we might have to wait for a SendDataRequest giving us more info about what happened
function isExpectedResponseToSendDataRequest(sent, received) {
    // Quick check for the function type instead of using the prototype
    if (received.functionType !== Constants_1.FunctionType.SendData)
        return false;
    // A SendDataRequest has to have the correct callback ID to be expected
    return (received instanceof SendDataRequest && received.callbackId === sent.callbackId);
}
let SendDataRequest = class SendDataRequest extends Message_1.Message {
    constructor(
    /** The command this message contains */
    command, 
    /** Options regarding the transmission of the message */
    transmitOptions, 
    /** A callback ID to map requests and responses */
    callbackId) {
        super();
        this.command = command;
        this.transmitOptions = transmitOptions;
        this.callbackId = callbackId;
        if (command != null) {
            // non-empty constructor -> define default values
            if (this.transmitOptions == null)
                this.transmitOptions = TransmitOptions.DEFAULT;
            if (this.callbackId == null)
                this.callbackId = getNextCallbackId();
        }
    }
    get transmitStatus() {
        return this._transmitStatus;
    }
    serialize() {
        if (this.command == null) {
            throw new ZWaveError_1.ZWaveError("Cannot serialize a SendData message without a command", ZWaveError_1.ZWaveErrorCodes.PacketFormat_Invalid);
        }
        const serializedCC = this.command.serialize();
        this.payload = Buffer.concat([
            serializedCC,
            Buffer.from([
                this.transmitOptions,
                this.callbackId,
            ]),
        ]);
        return super.serialize();
    }
    // We deserialize SendData requests differently as the controller responses have a different format
    deserialize(data) {
        const ret = super.deserialize(data);
        this.callbackId = this.payload[0];
        this._transmitStatus = this.payload[1];
        // not sure what bytes 2 and 3 mean
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            transmitOptions: this.transmitOptions,
            callbackId: this.callbackId,
            command: this.command,
        });
    }
    /** Checks if a received SendDataRequest indicates that sending failed */
    isFailed() {
        return this._transmitStatus !== TransmitStatus.OK;
    }
};
SendDataRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.SendData),
    Message_1.expectedResponse(isExpectedResponseToSendDataRequest),
    Message_1.priority(Constants_1.MessagePriority.Normal),
    __metadata("design:paramtypes", [CommandClass_1.CommandClass, Number, Number])
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
    Message_1.messageTypes(Constants_1.MessageType.Response, Constants_1.FunctionType.SendData)
], SendDataResponse);
exports.SendDataResponse = SendDataResponse;
