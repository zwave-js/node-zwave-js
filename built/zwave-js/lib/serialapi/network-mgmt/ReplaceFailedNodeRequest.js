"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplaceFailedNodeRequestStatusReport = exports.ReplaceFailedNodeResponse = exports.ReplaceFailedNodeRequest = exports.ReplaceFailedNodeRequestBase = exports.ReplaceFailedNodeStatus = exports.ReplaceFailedNodeStartFlags = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
var ReplaceFailedNodeStartFlags;
(function (ReplaceFailedNodeStartFlags) {
    ReplaceFailedNodeStartFlags[ReplaceFailedNodeStartFlags["OK"] = 0] = "OK";
    /** The replacing process was aborted because the controller  is not the primary one */
    ReplaceFailedNodeStartFlags[ReplaceFailedNodeStartFlags["NotPrimaryController"] = 2] = "NotPrimaryController";
    /** The replacing process was aborted because no call back function is used */
    ReplaceFailedNodeStartFlags[ReplaceFailedNodeStartFlags["NoCallbackFunction"] = 4] = "NoCallbackFunction";
    /** The replacing process aborted because the node was node found */
    ReplaceFailedNodeStartFlags[ReplaceFailedNodeStartFlags["NodeNotFound"] = 8] = "NodeNotFound";
    /** The replacing process is busy */
    ReplaceFailedNodeStartFlags[ReplaceFailedNodeStartFlags["ReplaceProcessBusy"] = 16] = "ReplaceProcessBusy";
    /** The replacing process could not be started*/
    ReplaceFailedNodeStartFlags[ReplaceFailedNodeStartFlags["ReplaceFailed"] = 32] = "ReplaceFailed";
})(ReplaceFailedNodeStartFlags = exports.ReplaceFailedNodeStartFlags || (exports.ReplaceFailedNodeStartFlags = {}));
var ReplaceFailedNodeStatus;
(function (ReplaceFailedNodeStatus) {
    /* ZW_ReplaceFailedNode callback status definitions */
    ReplaceFailedNodeStatus[ReplaceFailedNodeStatus["NodeOK"] = 0] = "NodeOK"; /* The node cannot be replaced because it is working properly (removed from the failed nodes list ) */
    /** The failed node is ready to be replaced and controller is ready to add new node with the nodeID of the failed node. */
    ReplaceFailedNodeStatus[ReplaceFailedNodeStatus["FailedNodeReplace"] = 3] = "FailedNodeReplace";
    /** The failed node has been replaced. */
    ReplaceFailedNodeStatus[ReplaceFailedNodeStatus["FailedNodeReplaceDone"] = 4] = "FailedNodeReplaceDone";
    /** The failed node has not been replaced */
    ReplaceFailedNodeStatus[ReplaceFailedNodeStatus["FailedNodeReplaceFailed"] = 5] = "FailedNodeReplaceFailed";
})(ReplaceFailedNodeStatus = exports.ReplaceFailedNodeStatus || (exports.ReplaceFailedNodeStatus = {}));
let ReplaceFailedNodeRequestBase = class ReplaceFailedNodeRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== ReplaceFailedNodeRequestStatusReport) {
            return new ReplaceFailedNodeRequestStatusReport(host, options);
        }
        super(host, options);
    }
};
ReplaceFailedNodeRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.ReplaceFailedNode),
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], ReplaceFailedNodeRequestBase);
exports.ReplaceFailedNodeRequestBase = ReplaceFailedNodeRequestBase;
let ReplaceFailedNodeRequest = class ReplaceFailedNodeRequest extends ReplaceFailedNodeRequestBase {
    constructor(host, options) {
        super(host, options);
        this.failedNodeId = options.failedNodeId;
    }
    serialize() {
        this.payload = Buffer.from([this.failedNodeId, this.callbackId]);
        return super.serialize();
    }
};
ReplaceFailedNodeRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.ReplaceFailedNode)
], ReplaceFailedNodeRequest);
exports.ReplaceFailedNodeRequest = ReplaceFailedNodeRequest;
let ReplaceFailedNodeResponse = class ReplaceFailedNodeResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this._replaceStatus = this.payload[0];
    }
    get replaceStatus() {
        return this._replaceStatus;
    }
    isOK() {
        return this._replaceStatus === ReplaceFailedNodeStartFlags.OK;
    }
};
ReplaceFailedNodeResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.ReplaceFailedNode)
], ReplaceFailedNodeResponse);
exports.ReplaceFailedNodeResponse = ReplaceFailedNodeResponse;
class ReplaceFailedNodeRequestStatusReport extends ReplaceFailedNodeRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
        this._replaceStatus = this.payload[1];
    }
    get replaceStatus() {
        return this._replaceStatus;
    }
    isOK() {
        return (this._replaceStatus ===
            ReplaceFailedNodeStatus.FailedNodeReplaceDone);
    }
}
exports.ReplaceFailedNodeRequestStatusReport = ReplaceFailedNodeRequestStatusReport;
//# sourceMappingURL=ReplaceFailedNodeRequest.js.map