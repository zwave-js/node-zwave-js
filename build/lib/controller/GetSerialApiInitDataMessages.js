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
const NodeBitMask_1 = require("./NodeBitMask");
let GetSerialApiInitDataRequest = class GetSerialApiInitDataRequest extends Message_1.Message {
};
GetSerialApiInitDataRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.GetSerialApiInitData),
    Message_1.expectedResponse(Constants_1.FunctionType.GetSerialApiInitData),
    Message_1.priority(Constants_1.MessagePriority.Controller)
], GetSerialApiInitDataRequest);
exports.GetSerialApiInitDataRequest = GetSerialApiInitDataRequest;
let GetSerialApiInitDataResponse = class GetSerialApiInitDataResponse extends Message_1.Message {
    get initVersion() {
        return this._initVersion;
    }
    get isSlave() {
        return (this._initCaps & 1 /* Slave */) !== 0;
    }
    get supportsTimers() {
        return (this._initCaps & 2 /* SupportsTimers */) !== 0;
    }
    get isSecondary() {
        return (this._initCaps & 4 /* Secondary */) !== 0;
    }
    get isStaticUpdateController() {
        return (this._initCaps & 8 /* SUC */) !== 0;
    }
    get nodeIds() {
        return this._nodeIds;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        this._initVersion = this.payload[0];
        this._initCaps = this.payload[1];
        this._nodeIds = [];
        if (this.payload.length > 2 && this.payload[2] === NodeBitMask_1.NUM_NODEMASK_BYTES) {
            // the payload contains a bit mask of all existing nodes
            const nodeBitMask = this.payload.slice(3, 3 + NodeBitMask_1.NUM_NODEMASK_BYTES);
            this._nodeIds = NodeBitMask_1.parseNodeBitMask(nodeBitMask);
        }
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            initVersion: this.initVersion,
            isSlave: this.isSlave,
            supportsTimers: this.supportsTimers,
            isSecondary: this.isSecondary,
            isStaticUpdateController: this.isStaticUpdateController,
            nodeIds: this.nodeIds,
        });
    }
};
GetSerialApiInitDataResponse = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Response, Constants_1.FunctionType.GetSerialApiInitData)
], GetSerialApiInitDataResponse);
exports.GetSerialApiInitDataResponse = GetSerialApiInitDataResponse;
