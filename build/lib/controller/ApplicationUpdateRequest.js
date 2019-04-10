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
const NodeInfo_1 = require("../node/NodeInfo");
/* eslint-disable @typescript-eslint/camelcase */
var ApplicationUpdateTypes;
(function (ApplicationUpdateTypes) {
    ApplicationUpdateTypes[ApplicationUpdateTypes["NodeInfo_Received"] = 132] = "NodeInfo_Received";
    ApplicationUpdateTypes[ApplicationUpdateTypes["NodeInfo_RequestDone"] = 130] = "NodeInfo_RequestDone";
    ApplicationUpdateTypes[ApplicationUpdateTypes["NodeInfo_RequestFailed"] = 129] = "NodeInfo_RequestFailed";
    ApplicationUpdateTypes[ApplicationUpdateTypes["RoutingPending"] = 128] = "RoutingPending";
    ApplicationUpdateTypes[ApplicationUpdateTypes["NewIdAssigned"] = 64] = "NewIdAssigned";
    ApplicationUpdateTypes[ApplicationUpdateTypes["DeleteDone"] = 32] = "DeleteDone";
    ApplicationUpdateTypes[ApplicationUpdateTypes["SUC_IdChanged"] = 16] = "SUC_IdChanged";
})(ApplicationUpdateTypes = exports.ApplicationUpdateTypes || (exports.ApplicationUpdateTypes = {}));
/* eslint-enable @typescript-eslint/camelcase */
let ApplicationUpdateRequest = 
// this is only received, not sent!
class ApplicationUpdateRequest extends Message_1.Message {
    get updateType() {
        return this._updateType;
    }
    get nodeId() {
        return this._nodeId;
    }
    get nodeInformation() {
        return this._nodeInformation;
    }
    serialize() {
        throw new Error("not implemented");
    }
    // this is for reports from the controller
    deserialize(data) {
        const ret = super.deserialize(data);
        this._updateType = this.payload[0];
        switch (this._updateType) {
            case ApplicationUpdateTypes.NodeInfo_Received: {
                this._nodeInformation = NodeInfo_1.parseNodeUpdatePayload(this.payload.slice(1));
                this._nodeId = this._nodeInformation.nodeId;
                break;
            }
        }
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            updateType: ApplicationUpdateTypes[this.updateType],
            nodeId: this.nodeId,
            nodeInformation: this.nodeInformation,
        });
    }
};
ApplicationUpdateRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.ApplicationUpdateRequest)
    // this is only received, not sent!
], ApplicationUpdateRequest);
exports.ApplicationUpdateRequest = ApplicationUpdateRequest;
