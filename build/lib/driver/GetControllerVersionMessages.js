"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = require("../message/Message");
const strings_1 = require("../util/strings");
var ControllerTypes;
(function (ControllerTypes) {
    ControllerTypes[ControllerTypes["Unknown"] = 0] = "Unknown";
    ControllerTypes[ControllerTypes["Static Controller"] = 1] = "Static Controller";
    ControllerTypes[ControllerTypes["Controller"] = 2] = "Controller";
    ControllerTypes[ControllerTypes["Enhanced Slave"] = 3] = "Enhanced Slave";
    ControllerTypes[ControllerTypes["Slave"] = 4] = "Slave";
    ControllerTypes[ControllerTypes["Installer"] = 5] = "Installer";
    ControllerTypes[ControllerTypes["Routing Slave"] = 6] = "Routing Slave";
    ControllerTypes[ControllerTypes["Bridge Controller"] = 7] = "Bridge Controller";
    ControllerTypes[ControllerTypes["Device under Test"] = 8] = "Device under Test";
})(ControllerTypes = exports.ControllerTypes || (exports.ControllerTypes = {}));
let GetControllerVersionRequest = class GetControllerVersionRequest extends Message_1.Message {
};
GetControllerVersionRequest = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Request, Message_1.FunctionType.GetControllerVersion),
    Message_1.expectedResponse(Message_1.FunctionType.GetControllerVersion)
], GetControllerVersionRequest);
exports.GetControllerVersionRequest = GetControllerVersionRequest;
let GetControllerVersionResponse = class GetControllerVersionResponse extends Message_1.Message {
    get controllerType() {
        return this._controllerType;
    }
    get libraryVersion() {
        return this._libraryVersion;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        // The payload consists of a zero-terminated string and a uint8 for the controller type
        this._libraryVersion = strings_1.cpp2js(this.payload.toString("ascii"));
        this._controllerType = this.payload[this.libraryVersion.length + 1];
        return ret;
    }
};
GetControllerVersionResponse = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Response, Message_1.FunctionType.GetControllerVersion)
], GetControllerVersionResponse);
exports.GetControllerVersionResponse = GetControllerVersionResponse;
