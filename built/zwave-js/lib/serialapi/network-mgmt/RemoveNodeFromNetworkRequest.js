"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveNodeFromNetworkRequestStatusReport = exports.RemoveNodeFromNetworkRequest = exports.RemoveNodeFromNetworkRequestBase = exports.RemoveNodeStatus = exports.RemoveNodeType = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
var RemoveNodeType;
(function (RemoveNodeType) {
    RemoveNodeType[RemoveNodeType["Any"] = 1] = "Any";
    RemoveNodeType[RemoveNodeType["Controller"] = 2] = "Controller";
    RemoveNodeType[RemoveNodeType["Slave"] = 3] = "Slave";
    RemoveNodeType[RemoveNodeType["Stop"] = 5] = "Stop";
})(RemoveNodeType = exports.RemoveNodeType || (exports.RemoveNodeType = {}));
var RemoveNodeStatus;
(function (RemoveNodeStatus) {
    RemoveNodeStatus[RemoveNodeStatus["Ready"] = 1] = "Ready";
    RemoveNodeStatus[RemoveNodeStatus["NodeFound"] = 2] = "NodeFound";
    RemoveNodeStatus[RemoveNodeStatus["RemovingSlave"] = 3] = "RemovingSlave";
    RemoveNodeStatus[RemoveNodeStatus["RemovingController"] = 4] = "RemovingController";
    RemoveNodeStatus[RemoveNodeStatus["Done"] = 6] = "Done";
    RemoveNodeStatus[RemoveNodeStatus["Failed"] = 7] = "Failed";
})(RemoveNodeStatus = exports.RemoveNodeStatus || (exports.RemoveNodeStatus = {}));
var RemoveNodeFlags;
(function (RemoveNodeFlags) {
    RemoveNodeFlags[RemoveNodeFlags["HighPower"] = 128] = "HighPower";
    RemoveNodeFlags[RemoveNodeFlags["NetworkWide"] = 64] = "NetworkWide";
})(RemoveNodeFlags || (RemoveNodeFlags = {}));
let RemoveNodeFromNetworkRequestBase = class RemoveNodeFromNetworkRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== RemoveNodeFromNetworkRequestStatusReport) {
            return new RemoveNodeFromNetworkRequestStatusReport(host, options);
        }
        super(host, options);
    }
};
RemoveNodeFromNetworkRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.RemoveNodeFromNetwork)
    // no expected response, the controller will respond with multiple RemoveNodeFromNetworkRequests
    ,
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], RemoveNodeFromNetworkRequestBase);
exports.RemoveNodeFromNetworkRequestBase = RemoveNodeFromNetworkRequestBase;
function testCallbackForRemoveNodeRequest(sent, received) {
    if (!(received instanceof RemoveNodeFromNetworkRequestStatusReport)) {
        return false;
    }
    switch (sent.removeNodeType) {
        case RemoveNodeType.Any:
        case RemoveNodeType.Controller:
        case RemoveNodeType.Slave:
            return (received.status === RemoveNodeStatus.Ready ||
                received.status === RemoveNodeStatus.Failed);
        case RemoveNodeType.Stop:
            return (received.status === RemoveNodeStatus.Done ||
                received.status === RemoveNodeStatus.Failed);
        default:
            return false;
    }
}
let RemoveNodeFromNetworkRequest = class RemoveNodeFromNetworkRequest extends RemoveNodeFromNetworkRequestBase {
    constructor(host, options = {}) {
        super(host, options);
        /** Whether to use high power */
        this.highPower = false;
        /** Whether to exclude network wide */
        this.networkWide = false;
        this.removeNodeType = options.removeNodeType;
        this.highPower = !!options.highPower;
        this.networkWide = !!options.networkWide;
    }
    serialize() {
        let data = this.removeNodeType || RemoveNodeType.Any;
        if (this.highPower)
            data |= RemoveNodeFlags.HighPower;
        if (this.networkWide)
            data |= RemoveNodeFlags.NetworkWide;
        this.payload = Buffer.from([data, this.callbackId]);
        return super.serialize();
    }
};
RemoveNodeFromNetworkRequest = __decorate([
    (0, serial_1.expectedCallback)(testCallbackForRemoveNodeRequest)
], RemoveNodeFromNetworkRequest);
exports.RemoveNodeFromNetworkRequest = RemoveNodeFromNetworkRequest;
class RemoveNodeFromNetworkRequestStatusReport extends RemoveNodeFromNetworkRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
        this.status = this.payload[1];
        switch (this.status) {
            case RemoveNodeStatus.Ready:
            case RemoveNodeStatus.NodeFound:
            case RemoveNodeStatus.Failed:
            case RemoveNodeStatus.Done:
                // no context for the status to parse
                // TODO:
                // An application MUST time out waiting for the REMOVE_NODE_STATUS_REMOVING_SLAVE status
                // if it does not receive the indication within a 14 sec after receiving the
                // REMOVE_NODE_STATUS_NODE_FOUND status.
                break;
            case RemoveNodeStatus.RemovingController:
            case RemoveNodeStatus.RemovingSlave:
                // the payload contains a node information frame
                this.statusContext = (0, core_1.parseNodeUpdatePayload)(this.payload.slice(2));
                break;
        }
    }
    isOK() {
        // Some of the status codes are for unsolicited callbacks, but
        // Failed is the only NOK status.
        return this.status !== RemoveNodeStatus.Failed;
    }
}
exports.RemoveNodeFromNetworkRequestStatusReport = RemoveNodeFromNetworkRequestStatusReport;
//# sourceMappingURL=RemoveNodeFromNetworkRequest.js.map