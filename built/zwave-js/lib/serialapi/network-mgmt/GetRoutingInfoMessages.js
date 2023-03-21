"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetRoutingInfoResponse = exports.GetRoutingInfoRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
let GetRoutingInfoRequest = class GetRoutingInfoRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.sourceNodeId = options.nodeId;
        this.removeNonRepeaters = !!options.removeNonRepeaters;
        this.removeBadLinks = !!options.removeBadLinks;
    }
    serialize() {
        this.payload = Buffer.from([
            this.sourceNodeId,
            this.removeNonRepeaters ? 1 : 0,
            this.removeBadLinks ? 1 : 0,
            0, // callbackId - this must be 0 as per the docs
        ]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "remove non-repeaters": this.removeNonRepeaters,
                "remove bad links": this.removeBadLinks,
            },
        };
    }
};
GetRoutingInfoRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetRoutingInfo),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetRoutingInfo),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], GetRoutingInfoRequest);
exports.GetRoutingInfoRequest = GetRoutingInfoRequest;
let GetRoutingInfoResponse = class GetRoutingInfoResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if (this.payload.length === core_1.NUM_NODEMASK_BYTES) {
            // the payload contains a bit mask of all neighbor nodes
            this._nodeIds = (0, core_1.parseNodeBitMask)(this.payload);
        }
        else {
            this._nodeIds = [];
        }
    }
    get nodeIds() {
        return this._nodeIds;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "node ids": `${this._nodeIds.join(", ")}` },
        };
    }
};
GetRoutingInfoResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetRoutingInfo)
], GetRoutingInfoResponse);
exports.GetRoutingInfoResponse = GetRoutingInfoResponse;
//# sourceMappingURL=GetRoutingInfoMessages.js.map