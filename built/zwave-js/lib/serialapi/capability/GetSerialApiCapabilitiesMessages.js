"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSerialApiCapabilitiesResponse = exports.GetSerialApiCapabilitiesRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const NUM_FUNCTIONS = 256;
const NUM_FUNCTION_BYTES = NUM_FUNCTIONS / 8;
let GetSerialApiCapabilitiesRequest = class GetSerialApiCapabilitiesRequest extends serial_1.Message {
};
GetSerialApiCapabilitiesRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetSerialApiCapabilities),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetSerialApiCapabilities),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetSerialApiCapabilitiesRequest);
exports.GetSerialApiCapabilitiesRequest = GetSerialApiCapabilitiesRequest;
let GetSerialApiCapabilitiesResponse = class GetSerialApiCapabilitiesResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            // The first 8 bytes are the api version, manufacturer id, product type and product id
            this.firmwareVersion = `${this.payload[0]}.${this.payload[1]}`;
            this.manufacturerId = this.payload.readUInt16BE(2);
            this.productType = this.payload.readUInt16BE(4);
            this.productId = this.payload.readUInt16BE(6);
            // then a 256bit bitmask for the supported command classes follows
            const functionBitMask = this.payload.slice(8, 8 + NUM_FUNCTION_BYTES);
            this.supportedFunctionTypes = (0, core_1.parseBitMask)(functionBitMask);
        }
        else {
            this.firmwareVersion = options.firmwareVersion;
            this.manufacturerId = options.manufacturerId;
            this.productType = options.productType;
            this.productId = options.productId;
            this.supportedFunctionTypes = options.supportedFunctionTypes;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(8 + NUM_FUNCTION_BYTES);
        const firmwareBytes = this.firmwareVersion
            .split(".", 2)
            .map((str) => parseInt(str));
        this.payload[0] = firmwareBytes[0];
        this.payload[1] = firmwareBytes[1];
        this.payload.writeUInt16BE(this.manufacturerId, 2);
        this.payload.writeUInt16BE(this.productType, 4);
        this.payload.writeUInt16BE(this.productId, 6);
        const functionBitMask = (0, core_1.encodeBitMask)(this.supportedFunctionTypes, NUM_FUNCTIONS);
        functionBitMask.copy(this.payload, 8);
        return super.serialize();
    }
};
GetSerialApiCapabilitiesResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetSerialApiCapabilities)
], GetSerialApiCapabilitiesResponse);
exports.GetSerialApiCapabilitiesResponse = GetSerialApiCapabilitiesResponse;
//# sourceMappingURL=GetSerialApiCapabilitiesMessages.js.map