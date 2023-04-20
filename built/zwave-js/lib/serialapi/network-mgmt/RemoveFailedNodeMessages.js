"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveFailedNodeResponse = exports.RemoveFailedNodeRequestStatusReport = exports.RemoveFailedNodeRequest = exports.RemoveFailedNodeRequestBase = exports.RemoveFailedNodeStatus = exports.RemoveFailedNodeStartFlags = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
var RemoveFailedNodeStartFlags;
(function (RemoveFailedNodeStartFlags) {
    RemoveFailedNodeStartFlags[RemoveFailedNodeStartFlags["OK"] = 0] = "OK";
    /** The removing process was aborted because the controller  is not the primary one */
    RemoveFailedNodeStartFlags[RemoveFailedNodeStartFlags["NotPrimaryController"] = 2] = "NotPrimaryController";
    /** The removing process was aborted because no call back function is used */
    RemoveFailedNodeStartFlags[RemoveFailedNodeStartFlags["NoCallbackFunction"] = 4] = "NoCallbackFunction";
    /** The removing process aborted because the node was node found */
    RemoveFailedNodeStartFlags[RemoveFailedNodeStartFlags["NodeNotFound"] = 8] = "NodeNotFound";
    /** The removing process is busy */
    RemoveFailedNodeStartFlags[RemoveFailedNodeStartFlags["RemoveProcessBusy"] = 16] = "RemoveProcessBusy";
    /** The removing process could not be started*/
    RemoveFailedNodeStartFlags[RemoveFailedNodeStartFlags["RemoveFailed"] = 32] = "RemoveFailed";
})(RemoveFailedNodeStartFlags = exports.RemoveFailedNodeStartFlags || (exports.RemoveFailedNodeStartFlags = {}));
var RemoveFailedNodeStatus;
(function (RemoveFailedNodeStatus) {
    /* ZW_RemoveFailedNode and ZW_ReplaceFailedNode callback status definitions */
    /** The node is working properly (removed from the failed nodes list ) */
    RemoveFailedNodeStatus[RemoveFailedNodeStatus["NodeOK"] = 0] = "NodeOK";
    /* ZW_RemoveFailedNode callback status definitions */
    /** The failed node was removed from the failed nodes list */
    RemoveFailedNodeStatus[RemoveFailedNodeStatus["NodeRemoved"] = 1] = "NodeRemoved";
    /** The failed node was not removed from the failing nodes list */
    RemoveFailedNodeStatus[RemoveFailedNodeStatus["NodeNotRemoved"] = 2] = "NodeNotRemoved";
})(RemoveFailedNodeStatus = exports.RemoveFailedNodeStatus || (exports.RemoveFailedNodeStatus = {}));
let RemoveFailedNodeRequestBase = class RemoveFailedNodeRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== RemoveFailedNodeRequestStatusReport) {
            return new RemoveFailedNodeRequestStatusReport(host, options);
        }
        super(host, options);
    }
};
RemoveFailedNodeRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.RemoveFailedNode),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], RemoveFailedNodeRequestBase);
exports.RemoveFailedNodeRequestBase = RemoveFailedNodeRequestBase;
let RemoveFailedNodeRequest = class RemoveFailedNodeRequest extends RemoveFailedNodeRequestBase {
    constructor(host, options) {
        super(host, options);
        this.failedNodeId = options.failedNodeId;
    }
    serialize() {
        this.payload = Buffer.from([this.failedNodeId, this.callbackId]);
        return super.serialize();
    }
};
RemoveFailedNodeRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.RemoveFailedNode),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.RemoveFailedNode)
], RemoveFailedNodeRequest);
exports.RemoveFailedNodeRequest = RemoveFailedNodeRequest;
class RemoveFailedNodeRequestStatusReport extends RemoveFailedNodeRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
        this._removeStatus = this.payload[1];
    }
    get removeStatus() {
        return this._removeStatus;
    }
    isOK() {
        return this._removeStatus === RemoveFailedNodeStatus.NodeRemoved;
    }
}
exports.RemoveFailedNodeRequestStatusReport = RemoveFailedNodeRequestStatusReport;
let RemoveFailedNodeResponse = class RemoveFailedNodeResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this._removeStatus = this.payload[0];
    }
    get removeStatus() {
        return this._removeStatus;
    }
    isOK() {
        return this._removeStatus === RemoveFailedNodeStartFlags.OK;
    }
};
RemoveFailedNodeResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.RemoveFailedNode)
], RemoveFailedNodeResponse);
exports.RemoveFailedNodeResponse = RemoveFailedNodeResponse;
//# sourceMappingURL=RemoveFailedNodeMessages.js.map