"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestNodeNeighborUpdateReport = exports.RequestNodeNeighborUpdateRequest = exports.RequestNodeNeighborUpdateRequestBase = exports.NodeNeighborUpdateStatus = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
var NodeNeighborUpdateStatus;
(function (NodeNeighborUpdateStatus) {
    NodeNeighborUpdateStatus[NodeNeighborUpdateStatus["UpdateStarted"] = 33] = "UpdateStarted";
    NodeNeighborUpdateStatus[NodeNeighborUpdateStatus["UpdateDone"] = 34] = "UpdateDone";
    NodeNeighborUpdateStatus[NodeNeighborUpdateStatus["UpdateFailed"] = 35] = "UpdateFailed";
})(NodeNeighborUpdateStatus = exports.NodeNeighborUpdateStatus || (exports.NodeNeighborUpdateStatus = {}));
let RequestNodeNeighborUpdateRequestBase = class RequestNodeNeighborUpdateRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== RequestNodeNeighborUpdateReport) {
            return new RequestNodeNeighborUpdateReport(host, options);
        }
        super(host, options);
    }
};
RequestNodeNeighborUpdateRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.RequestNodeNeighborUpdate),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], RequestNodeNeighborUpdateRequestBase);
exports.RequestNodeNeighborUpdateRequestBase = RequestNodeNeighborUpdateRequestBase;
let RequestNodeNeighborUpdateRequest = class RequestNodeNeighborUpdateRequest extends RequestNodeNeighborUpdateRequestBase {
    constructor(host, options) {
        super(host, options);
        this.nodeId = options.nodeId;
        this.discoveryTimeout = options.discoveryTimeout;
    }
    serialize() {
        this.payload = Buffer.from([this.nodeId, this.callbackId]);
        return super.serialize();
    }
    getCallbackTimeout() {
        return this.discoveryTimeout;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "callback id": this.callbackId },
        };
    }
};
RequestNodeNeighborUpdateRequest = __decorate([
    (0, serial_1.expectedCallback)(serial_1.FunctionType.RequestNodeNeighborUpdate)
], RequestNodeNeighborUpdateRequest);
exports.RequestNodeNeighborUpdateRequest = RequestNodeNeighborUpdateRequest;
class RequestNodeNeighborUpdateReport extends RequestNodeNeighborUpdateRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
        this._updateStatus = this.payload[1];
    }
    isOK() {
        return this._updateStatus !== NodeNeighborUpdateStatus.UpdateFailed;
    }
    isFinal() {
        return this._updateStatus === NodeNeighborUpdateStatus.UpdateDone;
    }
    get updateStatus() {
        return this._updateStatus;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "callback id": this.callbackId,
                "update status": (0, shared_1.getEnumMemberName)(NodeNeighborUpdateStatus, this._updateStatus),
            },
        };
    }
}
exports.RequestNodeNeighborUpdateReport = RequestNodeNeighborUpdateReport;
//# sourceMappingURL=RequestNodeNeighborUpdateMessages.js.map