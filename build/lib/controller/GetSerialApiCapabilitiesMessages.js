"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
const strings_1 = require("../util/strings");
const ValueTypes_1 = require("../util/ValueTypes");
const NUM_FUNCTIONS = 256;
const NUM_FUNCTION_BYTES = NUM_FUNCTIONS / 8;
let GetSerialApiCapabilitiesRequest = class GetSerialApiCapabilitiesRequest extends Message_1.Message {
};
GetSerialApiCapabilitiesRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.GetSerialApiCapabilities),
    Message_1.expectedResponse(Constants_1.FunctionType.GetSerialApiCapabilities),
    Message_1.priority(Constants_1.MessagePriority.Controller)
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
    get supportedFunctionTypes() {
        return this._supportedFunctionTypes;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        // The first 8 bytes are the api version, manufacturer id, product type and product id
        this._serialApiVersion = `${this.payload[0]}.${this.payload[1]}`;
        this._manufacturerId = this.payload.readUInt16BE(2);
        this._productType = this.payload.readUInt16BE(4);
        this._productId = this.payload.readUInt16BE(6);
        // then a 256bit bitmask for the supported command classes follows
        const functionBitMask = this.payload.slice(8, 8 + NUM_FUNCTION_BYTES);
        this._supportedFunctionTypes = ValueTypes_1.parseBitMask(functionBitMask);
        // this._supportedFunctionTypes = [];
        // for (let functionType = 1; functionType <= NUM_FUNCTIONS; functionType++) {
        // 	const byteNum = (functionType - 1) >>> 3; // type / 8
        // 	const bitNum = (functionType - 1) % 8;
        // 	if ((functionBitMask[byteNum] & (1 << bitNum)) !== 0) this._supportedFunctionTypes.push(functionType);
        // }
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            serialApiVersion: this.serialApiVersion,
            manufacturerId: this.manufacturerId,
            productType: this.productType,
            productId: this.productId,
            supportedFunctionTypes: this.supportedFunctionTypes.map(type => type in Constants_1.FunctionType ? Constants_1.FunctionType[type] : strings_1.num2hex(type)),
        });
    }
};
GetSerialApiCapabilitiesResponse = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Response, Constants_1.FunctionType.GetSerialApiCapabilities)
], GetSerialApiCapabilitiesResponse);
exports.GetSerialApiCapabilitiesResponse = GetSerialApiCapabilitiesResponse;
