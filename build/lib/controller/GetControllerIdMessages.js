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
let GetControllerIdRequest = class GetControllerIdRequest extends Message_1.Message {
};
GetControllerIdRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.GetControllerId),
    Message_1.expectedResponse(Constants_1.FunctionType.GetControllerId),
    Message_1.priority(Constants_1.MessagePriority.Controller)
], GetControllerIdRequest);
exports.GetControllerIdRequest = GetControllerIdRequest;
let GetControllerIdResponse = class GetControllerIdResponse extends Message_1.Message {
    get homeId() {
        return this._homeId;
    }
    get ownNodeId() {
        return this._ownNodeId;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        // The payload is 4 bytes home id, followed by the controller node id
        this._homeId = this.payload.readUInt32BE(0);
        this._ownNodeId = this.payload.readUInt8(4);
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            homeId: strings_1.num2hex(this.homeId),
            ownNodeId: this.ownNodeId,
        });
    }
};
GetControllerIdResponse = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Response, Constants_1.FunctionType.GetControllerId)
], GetControllerIdResponse);
exports.GetControllerIdResponse = GetControllerIdResponse;
