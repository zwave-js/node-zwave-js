"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetControllerIdResponse = exports.GetControllerIdRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let GetControllerIdRequest = class GetControllerIdRequest extends serial_1.Message {
};
GetControllerIdRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetControllerId),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetControllerId),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetControllerIdRequest);
exports.GetControllerIdRequest = GetControllerIdRequest;
let GetControllerIdResponse = class GetControllerIdResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            // The payload is 4 bytes home id, followed by the controller node id
            this.homeId = this.payload.readUInt32BE(0);
            this.ownNodeId = this.payload.readUInt8(4);
        }
        else {
            this.homeId = options.homeId;
            this.ownNodeId = options.ownNodeId;
        }
    }
    serialize() {
        this.payload = Buffer.allocUnsafe(5);
        this.payload.writeUInt32BE(this.homeId, 0);
        this.payload.writeUInt8(this.ownNodeId, 4);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "home ID": (0, shared_1.num2hex)(this.homeId),
                "own node ID": this.ownNodeId,
            },
        };
    }
};
GetControllerIdResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetControllerId)
], GetControllerIdResponse);
exports.GetControllerIdResponse = GetControllerIdResponse;
//# sourceMappingURL=GetControllerIdMessages.js.map