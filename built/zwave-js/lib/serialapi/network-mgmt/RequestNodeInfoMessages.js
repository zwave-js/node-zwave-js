"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestNodeInfoRequest = exports.RequestNodeInfoResponse = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const ApplicationUpdateRequest_1 = require("../application/ApplicationUpdateRequest");
let RequestNodeInfoResponse = class RequestNodeInfoResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.wasSent = this.payload[0] !== 0;
        }
        else {
            this.wasSent = options.wasSent;
        }
    }
    isOK() {
        return this.wasSent;
    }
    serialize() {
        this.payload = Buffer.from([this.wasSent ? 0x01 : 0]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "was sent": this.wasSent },
        };
    }
};
RequestNodeInfoResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.RequestNodeInfo)
], RequestNodeInfoResponse);
exports.RequestNodeInfoResponse = RequestNodeInfoResponse;
function testCallbackForRequestNodeInfoRequest(sent, received) {
    return ((received instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeInfoReceived &&
        received.nodeId === sent.nodeId) ||
        received instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequestNodeInfoRequestFailed);
}
let RequestNodeInfoRequest = class RequestNodeInfoRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.nodeId = this.payload[0];
        }
        else {
            this.nodeId = options.nodeId;
        }
    }
    needsCallbackId() {
        // Not sure why it is this way, but this message contains no callback id
        return false;
    }
    serialize() {
        this.payload = Buffer.from([this.nodeId]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "node id": this.nodeId },
        };
    }
};
RequestNodeInfoRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.RequestNodeInfo),
    (0, serial_1.expectedResponse)(RequestNodeInfoResponse),
    (0, serial_1.expectedCallback)(testCallbackForRequestNodeInfoRequest),
    (0, serial_1.priority)(core_1.MessagePriority.NodeQuery)
], RequestNodeInfoRequest);
exports.RequestNodeInfoRequest = RequestNodeInfoRequest;
//# sourceMappingURL=RequestNodeInfoMessages.js.map