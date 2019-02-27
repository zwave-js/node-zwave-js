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
const Driver_1 = require("../driver/Driver");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
let SetSerialApiTimeoutsRequest = class SetSerialApiTimeoutsRequest extends Message_1.Message {
    constructor(driver, ackTimeout, byteTimeout) {
        super(driver);
        this.ackTimeout = ackTimeout;
        this.byteTimeout = byteTimeout;
    }
    serialize() {
        this.payload = Buffer.from([
            Math.round(this.ackTimeout / 10),
            Math.round(this.byteTimeout / 10),
        ]);
        return super.serialize();
    }
    toJSON() {
        return super.toJSONInherited({
            ackTimeout: this.ackTimeout,
            byteTimeout: this.byteTimeout,
        });
    }
};
SetSerialApiTimeoutsRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.SetSerialApiTimeouts),
    Message_1.expectedResponse(Constants_1.FunctionType.SetSerialApiTimeouts),
    Message_1.priority(Constants_1.MessagePriority.Controller),
    __metadata("design:paramtypes", [Driver_1.Driver, Number, Number])
], SetSerialApiTimeoutsRequest);
exports.SetSerialApiTimeoutsRequest = SetSerialApiTimeoutsRequest;
let SetSerialApiTimeoutsResponse = class SetSerialApiTimeoutsResponse extends Message_1.Message {
    get oldAckTimeout() {
        return this._oldAckTimeout;
    }
    get oldByteTimeout() {
        return this._oldByteTimeout;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        this._oldAckTimeout = this.payload[0] * 10;
        this._oldByteTimeout = this.payload[1] * 10;
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            oldAckTimeout: this.oldAckTimeout,
            oldByteTimeout: this.oldByteTimeout,
        });
    }
};
SetSerialApiTimeoutsResponse = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Response, Constants_1.FunctionType.SetSerialApiTimeouts)
], SetSerialApiTimeoutsResponse);
exports.SetSerialApiTimeoutsResponse = SetSerialApiTimeoutsResponse;
