"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsFailedNodeResponse = exports.IsFailedNodeRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let IsFailedNodeRequest = class IsFailedNodeRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.failedNodeId = options.failedNodeId;
    }
    serialize() {
        this.payload = Buffer.from([this.failedNodeId]);
        return super.serialize();
    }
};
IsFailedNodeRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.IsFailedNode),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.IsFailedNode),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], IsFailedNodeRequest);
exports.IsFailedNodeRequest = IsFailedNodeRequest;
let IsFailedNodeResponse = class IsFailedNodeResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.result = !!this.payload[0];
    }
};
IsFailedNodeResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.IsFailedNode)
], IsFailedNodeResponse);
exports.IsFailedNodeResponse = IsFailedNodeResponse;
//# sourceMappingURL=IsFailedNodeMessages.js.map