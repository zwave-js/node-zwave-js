"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSUCNodeIdResponse = exports.GetSUCNodeIdRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let GetSUCNodeIdRequest = class GetSUCNodeIdRequest extends serial_1.Message {
};
GetSUCNodeIdRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetSUCNodeId),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetSUCNodeId),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetSUCNodeIdRequest);
exports.GetSUCNodeIdRequest = GetSUCNodeIdRequest;
let GetSUCNodeIdResponse = class GetSUCNodeIdResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.sucNodeId = this.payload[0];
        }
        else {
            this.sucNodeId = options.sucNodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.sucNodeId]);
        return super.serialize();
    }
};
GetSUCNodeIdResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetSUCNodeId)
], GetSUCNodeIdResponse);
exports.GetSUCNodeIdResponse = GetSUCNodeIdResponse;
//# sourceMappingURL=GetSUCNodeIdMessages.js.map