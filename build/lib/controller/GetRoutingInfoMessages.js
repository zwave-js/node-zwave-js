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
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
const NodeBitMask_1 = require("./NodeBitMask");
let GetRoutingInfoRequest = class GetRoutingInfoRequest extends Message_1.Message {
    constructor(driver, nodeId, removeNonRepeaters, removeBadLinks) {
        super(driver);
        this.nodeId = nodeId;
        this.removeNonRepeaters = removeNonRepeaters;
        this.removeBadLinks = removeBadLinks;
    }
    serialize() {
        this.payload = Buffer.from([
            this.nodeId,
            this.removeNonRepeaters ? 1 : 0,
            this.removeBadLinks ? 1 : 0,
            0,
        ]);
        return super.serialize();
    }
    toJSON() {
        return super.toJSONInherited({
            nodeId: this.nodeId,
            removeNonRepeaters: this.removeNonRepeaters,
            removeBadLinks: this.removeBadLinks,
        });
    }
};
GetRoutingInfoRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.GetRoutingInfo),
    Message_1.expectedResponse(Constants_1.FunctionType.GetRoutingInfo),
    Message_1.priority(Constants_1.MessagePriority.Controller),
    __metadata("design:paramtypes", [Object, Number, Boolean, Boolean])
], GetRoutingInfoRequest);
exports.GetRoutingInfoRequest = GetRoutingInfoRequest;
let GetRoutingInfoResponse = class GetRoutingInfoResponse extends Message_1.Message {
    get nodeIds() {
        return this._nodeIds;
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        if (this.payload.length === NodeBitMask_1.NUM_NODEMASK_BYTES) {
            // the payload contains a bit mask of all neighbor nodes
            this._nodeIds = NodeBitMask_1.parseNodeBitMask(this.payload);
        }
        else {
            this._nodeIds = [];
        }
        return ret;
    }
};
GetRoutingInfoResponse = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Response, Constants_1.FunctionType.GetRoutingInfo)
], GetRoutingInfoResponse);
exports.GetRoutingInfoResponse = GetRoutingInfoResponse;
