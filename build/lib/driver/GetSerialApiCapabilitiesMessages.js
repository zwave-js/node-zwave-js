"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = require("../message/Message");
let GetSerialApiCapabilitiesRequest = class GetSerialApiCapabilitiesRequest extends Message_1.Message {
};
GetSerialApiCapabilitiesRequest = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Request, Message_1.FunctionType.GetSerialApiCapabilities),
    Message_1.expectedResponse(Message_1.FunctionType.GetSerialApiCapabilities)
], GetSerialApiCapabilitiesRequest);
exports.GetSerialApiCapabilitiesRequest = GetSerialApiCapabilitiesRequest;
let GetSerialApiCapabilitiesResponse = class GetSerialApiCapabilitiesResponse extends Message_1.Message {
    get serialApiVersion() {
        return this._serialApiVersion;
    }
    get manufacturerId() {
        return this._manufacturerId;
    }
    get productType() {
        return this._productType;
    }
    get productId() {
        return this._productId;
    }
    get functionBitMask() {
        return this._functionBitMask;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        // The first 8 bytes are the api version, manufacturer id, product type and product id
        this._serialApiVersion = `${this.payload[0]}.${this.payload[1]}`;
        this._manufacturerId = this.payload.readUInt16BE(2);
        this._productType = this.payload.readUInt16BE(4);
        this._productId = this.payload.readUInt16BE(6);
        // then a 256bit bitmask for the supported command classes follows
        this._functionBitMask = Buffer.allocUnsafe(256 / 8);
        this.payload.copy(this._functionBitMask, 0, 8, 8 + this._functionBitMask.length);
        return ret;
    }
};
GetSerialApiCapabilitiesResponse = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Response, Message_1.FunctionType.GetSerialApiCapabilities)
], GetSerialApiCapabilitiesResponse);
exports.GetSerialApiCapabilitiesResponse = GetSerialApiCapabilitiesResponse;
