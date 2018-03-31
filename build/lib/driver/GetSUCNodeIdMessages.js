"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Message_1 = require("../message/Message");
let GetSUCNodeIdRequest = class GetSUCNodeIdRequest extends Message_1.Message {
};
GetSUCNodeIdRequest = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Request, Message_1.FunctionType.GetSUCNodeId),
    Message_1.expectedResponse(Message_1.FunctionType.GetSUCNodeId),
    Message_1.priority(Message_1.MessagePriority.Controller)
], GetSUCNodeIdRequest);
exports.GetSUCNodeIdRequest = GetSUCNodeIdRequest;
let GetSUCNodeIdResponse = class GetSUCNodeIdResponse extends Message_1.Message {
    /** The node id of the SUC or 0 if none is present */
    get sucNodeId() {
        return this._sucNodeId;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        // Just a single byte
        this._sucNodeId = this.payload[0];
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            sucNodeId: this.sucNodeId,
        });
    }
};
GetSUCNodeIdResponse = __decorate([
    Message_1.messageTypes(Message_1.MessageType.Response, Message_1.FunctionType.GetSUCNodeId)
], GetSUCNodeIdResponse);
exports.GetSUCNodeIdResponse = GetSUCNodeIdResponse;
