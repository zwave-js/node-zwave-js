"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetNodeProtocolInfoResponse = exports.GetNodeProtocolInfoRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let GetNodeProtocolInfoRequest = class GetNodeProtocolInfoRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.requestedNodeId = this.payload[0];
        }
        else {
            this.requestedNodeId = options.requestedNodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.requestedNodeId]);
        return super.serialize();
    }
};
GetNodeProtocolInfoRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetNodeProtocolInfo),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetNodeProtocolInfo),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetNodeProtocolInfoRequest);
exports.GetNodeProtocolInfoRequest = GetNodeProtocolInfoRequest;
let GetNodeProtocolInfoResponse = class GetNodeProtocolInfoResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            const { hasSpecificDeviceClass, ...rest } = (0, core_1.parseNodeProtocolInfo)(this.payload, 0);
            this.isListening = rest.isListening;
            this.isFrequentListening = rest.isFrequentListening;
            this.isRouting = rest.isRouting;
            this.supportedDataRates = rest.supportedDataRates;
            this.protocolVersion = rest.protocolVersion;
            this.optionalFunctionality = rest.optionalFunctionality;
            this.nodeType = rest.nodeType;
            this.supportsSecurity = rest.supportsSecurity;
            this.supportsBeaming = rest.supportsBeaming;
            // parse the device class
            this.basicDeviceClass = this.payload[3];
            this.genericDeviceClass = this.payload[4];
            this.specificDeviceClass = hasSpecificDeviceClass
                ? this.payload[5]
                : 0x00;
        }
        else {
            this.isListening = options.isListening;
            this.isFrequentListening = options.isFrequentListening;
            this.isRouting = options.isRouting;
            this.supportedDataRates = options.supportedDataRates;
            this.protocolVersion = options.protocolVersion;
            this.optionalFunctionality = options.optionalFunctionality;
            this.nodeType = options.nodeType;
            this.supportsSecurity = options.supportsSecurity;
            this.supportsBeaming = options.supportsBeaming;
            this.basicDeviceClass = options.basicDeviceClass;
            this.genericDeviceClass = options.genericDeviceClass;
            this.specificDeviceClass = options.specificDeviceClass;
        }
    }
    serialize() {
        const protocolInfo = (0, core_1.encodeNodeProtocolInfo)({
            isListening: this.isListening,
            isFrequentListening: this.isFrequentListening,
            isRouting: this.isRouting,
            supportedDataRates: this.supportedDataRates,
            protocolVersion: this.protocolVersion,
            optionalFunctionality: this.optionalFunctionality,
            nodeType: this.nodeType,
            supportsSecurity: this.supportsSecurity,
            supportsBeaming: this.supportsBeaming,
            hasSpecificDeviceClass: this.specificDeviceClass !== 0,
        });
        this.payload = Buffer.concat([
            protocolInfo,
            Buffer.from([
                this.basicDeviceClass,
                this.genericDeviceClass,
                this.specificDeviceClass,
            ]),
        ]);
        return super.serialize();
    }
};
GetNodeProtocolInfoResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetNodeProtocolInfo)
], GetNodeProtocolInfoResponse);
exports.GetNodeProtocolInfoResponse = GetNodeProtocolInfoResponse;
//# sourceMappingURL=GetNodeProtocolInfoMessages.js.map