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
const ApplicationUpdateRequest_1 = require("../controller/ApplicationUpdateRequest");
const Driver_1 = require("../driver/Driver");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
let RequestNodeInfoRequest = class RequestNodeInfoRequest extends Message_1.Message {
    constructor(driver, nodeId) {
        super(driver);
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
RequestNodeInfoRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.RequestNodeInfo),
    Message_1.expectedResponse(testResponseForNodeInfoRequest),
    Message_1.priority(Constants_1.MessagePriority.NodeQuery),
    __metadata("design:paramtypes", [Driver_1.Driver, Number])
], RequestNodeInfoRequest);
exports.RequestNodeInfoRequest = RequestNodeInfoRequest;
let RequestNodeInfoResponse = class RequestNodeInfoResponse extends Message_1.Message {
    get wasSent() {
        return this._wasSent;
    }
    get errorCode() {
        return this._errorCode;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        this._wasSent = this.payload[0] !== 0;
        if (!this._wasSent)
            this._errorCode = this.payload[0];
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            wasSent: this.wasSent,
            errorCode: this.errorCode,
        });
    }
};
RequestNodeInfoResponse = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Response, Constants_1.FunctionType.RequestNodeInfo)
], RequestNodeInfoResponse);
exports.RequestNodeInfoResponse = RequestNodeInfoResponse;
function testResponseForNodeInfoRequest(sent, received) {
    if (received instanceof RequestNodeInfoResponse) {
        return received.wasSent
            ? "intermediate"
            : "fatal_controller";
    }
    else if (received instanceof ApplicationUpdateRequest_1.ApplicationUpdateRequest) {
        // received node info for the correct node
        if (received.updateType === ApplicationUpdateRequest_1.ApplicationUpdateTypes.NodeInfo_Received
            && received.nodeId === sent.nodeId)
            return "final";
        // requesting node info failed. We cannot check which node that belongs to
        if (received.updateType === ApplicationUpdateRequest_1.ApplicationUpdateTypes.NodeInfo_RequestFailed)
            return "fatal_node";
    }
}
