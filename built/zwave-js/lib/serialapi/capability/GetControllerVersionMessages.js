"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetControllerVersionResponse = exports.GetControllerVersionRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let GetControllerVersionRequest = class GetControllerVersionRequest extends serial_1.Message {
};
GetControllerVersionRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetControllerVersion),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetControllerVersion),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetControllerVersionRequest);
exports.GetControllerVersionRequest = GetControllerVersionRequest;
let GetControllerVersionResponse = class GetControllerVersionResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            // The payload consists of a zero-terminated string and a uint8 for the controller type
            this.libraryVersion = (0, shared_1.cpp2js)(this.payload.toString("ascii"));
            this.controllerType = this.payload[this.libraryVersion.length + 1];
        }
        else {
            this.controllerType = options.controllerType;
            this.libraryVersion = options.libraryVersion;
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from(`${this.libraryVersion}\0`, "ascii"),
            Buffer.from([this.controllerType]),
        ]);
        return super.serialize();
    }
};
GetControllerVersionResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetControllerVersion)
], GetControllerVersionResponse);
exports.GetControllerVersionResponse = GetControllerVersionResponse;
//# sourceMappingURL=GetControllerVersionMessages.js.map