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
const DeviceClass_1 = require("./DeviceClass");
let GetNodeProtocolInfoRequest = class GetNodeProtocolInfoRequest extends Message_1.Message {
    constructor(nodeId) {
        super();
        this.nodeId = nodeId;
    }
    serialize() {
        this.payload = Buffer.from([this.nodeId]);
        return super.serialize();
    }
    toJSON() {
        return super.toJSONInherited({
            nodeId: this.nodeId,
        });
    }
};
GetNodeProtocolInfoRequest = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Request, Message_1.FunctionType.GetNodeProtocolInfo),
    Message_1.expectedResponse(Message_1.FunctionType.GetNodeProtocolInfo),
    Message_1.priority(Message_1.MessagePriority.NodeQuery),
    __metadata("design:paramtypes", [Number])
], GetNodeProtocolInfoRequest);
exports.GetNodeProtocolInfoRequest = GetNodeProtocolInfoRequest;
let GetNodeProtocolInfoResponse = class GetNodeProtocolInfoResponse extends Message_1.Message {
    get isListening() {
        return this._isListening;
    }
    get isFrequentListening() {
        return this._isFrequentListening;
    }
    get isRouting() {
        return this._isRouting;
    }
    get maxBaudRate() {
        return this._maxBaudRate;
    }
    get isSecure() {
        return this._isSecure;
    }
    get version() {
        return this._version;
    }
    get isBeaming() {
        return this._isBeaming;
    }
    get deviceClass() {
        return this._deviceClass;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        const capabilities = this.payload[0];
        this._isListening = (capabilities & 128 /* Listening */) !== 0;
        this._isRouting = (capabilities & 64 /* Routing */) !== 0;
        // This is an educated guess. OZW only checks for the 40k flag
        switch (capabilities & 56 /* BaudrateMask */) {
            case 32 /* Baudrate_100k */:
                this._maxBaudRate = 100000;
                break;
            case 16 /* Baudrate_40k */:
                this._maxBaudRate = 40000;
                break;
            case 8 /* Baudrate_9k6 */:
                this._maxBaudRate = 9600;
                break;
        }
        this._version = (capabilities & 7 /* VersionMask */) + 1;
        const security = this.payload[1];
        this._isSecure = (security & 1 /* Security */) !== 0;
        this._isFrequentListening = (security & (64 /* Sensor1000ms */ | 32 /* Sensor250ms */)) !== 0;
        this._isBeaming = (security & 16 /* BeamCapability */) !== 0;
        // parse the device class
        const basic = this.payload[3];
        const generic = DeviceClass_1.GenericDeviceClass.get(this.payload[4]);
        const specific = DeviceClass_1.SpecificDeviceClass.get(generic.key, this.payload[5]);
        this._deviceClass = new DeviceClass_1.DeviceClass(basic, generic, specific);
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            isListening: this.isListening,
            isFrequentListening: this.isFrequentListening,
            isRouting: this.isRouting,
            maxBaudRate: this.maxBaudRate,
            isSecure: this.isSecure,
            version: this.version,
            isBeaming: this.isBeaming,
            deviceClass: this.deviceClass,
        });
    }
};
GetNodeProtocolInfoResponse = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Response, Message_1.FunctionType.GetNodeProtocolInfo)
], GetNodeProtocolInfoResponse);
exports.GetNodeProtocolInfoResponse = GetNodeProtocolInfoResponse;
