"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddNodeToNetworkRequestStatusReport = exports.AddNodeDSKToNetworkRequest = exports.EnableSmartStartListenRequest = exports.AddNodeToNetworkRequest = exports.AddNodeToNetworkRequestBase = exports.computeNeighborDiscoveryTimeout = exports.AddNodeStatus = exports.AddNodeType = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
var AddNodeType;
(function (AddNodeType) {
    AddNodeType[AddNodeType["Any"] = 1] = "Any";
    AddNodeType[AddNodeType["Controller"] = 2] = "Controller";
    AddNodeType[AddNodeType["Slave"] = 3] = "Slave";
    AddNodeType[AddNodeType["Existing"] = 4] = "Existing";
    AddNodeType[AddNodeType["Stop"] = 5] = "Stop";
    AddNodeType[AddNodeType["StopControllerReplication"] = 6] = "StopControllerReplication";
    AddNodeType[AddNodeType["SmartStartDSK"] = 8] = "SmartStartDSK";
    AddNodeType[AddNodeType["SmartStartListen"] = 9] = "SmartStartListen";
})(AddNodeType = exports.AddNodeType || (exports.AddNodeType = {}));
var AddNodeStatus;
(function (AddNodeStatus) {
    AddNodeStatus[AddNodeStatus["Ready"] = 1] = "Ready";
    AddNodeStatus[AddNodeStatus["NodeFound"] = 2] = "NodeFound";
    AddNodeStatus[AddNodeStatus["AddingSlave"] = 3] = "AddingSlave";
    AddNodeStatus[AddNodeStatus["AddingController"] = 4] = "AddingController";
    AddNodeStatus[AddNodeStatus["ProtocolDone"] = 5] = "ProtocolDone";
    AddNodeStatus[AddNodeStatus["Done"] = 6] = "Done";
    AddNodeStatus[AddNodeStatus["Failed"] = 7] = "Failed";
})(AddNodeStatus = exports.AddNodeStatus || (exports.AddNodeStatus = {}));
var AddNodeFlags;
(function (AddNodeFlags) {
    AddNodeFlags[AddNodeFlags["HighPower"] = 128] = "HighPower";
    AddNodeFlags[AddNodeFlags["NetworkWide"] = 64] = "NetworkWide";
})(AddNodeFlags || (AddNodeFlags = {}));
function computeNeighborDiscoveryTimeout(host, nodeType) {
    const allNodes = [...host.nodes.values()];
    const numListeningNodes = allNodes.filter((n) => n.isListening).length;
    const numFlirsNodes = allNodes.filter((n) => n.isFrequentListening).length;
    const numNodes = allNodes.length;
    // According to the Appl-Programmers-Guide
    return (76000 +
        numListeningNodes * 217 +
        numFlirsNodes * 3517 +
        (nodeType === core_1.NodeType.Controller ? numNodes * 732 : 0));
}
exports.computeNeighborDiscoveryTimeout = computeNeighborDiscoveryTimeout;
let AddNodeToNetworkRequestBase = class AddNodeToNetworkRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== AddNodeToNetworkRequestStatusReport) {
            return new AddNodeToNetworkRequestStatusReport(host, options);
        }
        super(host, options);
    }
};
AddNodeToNetworkRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.AddNodeToNetwork)
    // no expected response, the controller will respond with multiple AddNodeToNetworkRequests
    ,
    (0, serial_1.priority)(core_1.MessagePriority.Controller)
], AddNodeToNetworkRequestBase);
exports.AddNodeToNetworkRequestBase = AddNodeToNetworkRequestBase;
function testCallbackForAddNodeRequest(sent, received) {
    if (!(received instanceof AddNodeToNetworkRequestStatusReport)) {
        return false;
    }
    switch (sent.addNodeType) {
        case AddNodeType.Any:
        case AddNodeType.Controller:
        case AddNodeType.Slave:
        case AddNodeType.Existing:
            return (received.status === AddNodeStatus.Ready ||
                received.status === AddNodeStatus.Failed);
        case AddNodeType.Stop:
        case AddNodeType.StopControllerReplication:
            return (received.status === AddNodeStatus.Done ||
                received.status === AddNodeStatus.Failed);
        default:
            return false;
    }
}
let AddNodeToNetworkRequest = class AddNodeToNetworkRequest extends AddNodeToNetworkRequestBase {
    constructor(host, options = {}) {
        super(host, options);
        /** Whether to use high power */
        this.highPower = false;
        /** Whether to include network wide */
        this.networkWide = false;
        this.addNodeType = options.addNodeType;
        this.highPower = !!options.highPower;
        this.networkWide = !!options.networkWide;
    }
    serialize() {
        let data = this.addNodeType || AddNodeType.Any;
        if (this.highPower)
            data |= AddNodeFlags.HighPower;
        if (this.networkWide)
            data |= AddNodeFlags.NetworkWide;
        this.payload = Buffer.from([data, this.callbackId]);
        return super.serialize();
    }
    toLogEntry() {
        let message;
        if (this.addNodeType === AddNodeType.Stop) {
            message = { action: "Stop" };
        }
        else {
            message = {
                "node type": (0, shared_1.getEnumMemberName)(AddNodeType, this.addNodeType),
            };
        }
        message = {
            ...message,
            "high power": this.highPower,
            "network wide": this.networkWide,
        };
        if (this.hasCallbackId()) {
            message["callback id"] = this.callbackId;
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
AddNodeToNetworkRequest = __decorate([
    (0, serial_1.expectedCallback)(testCallbackForAddNodeRequest)
], AddNodeToNetworkRequest);
exports.AddNodeToNetworkRequest = AddNodeToNetworkRequest;
class EnableSmartStartListenRequest extends AddNodeToNetworkRequestBase {
    serialize() {
        const control = AddNodeType.SmartStartListen | AddNodeFlags.NetworkWide;
        // The Serial API does not send a callback, so disable waiting for one
        this.callbackId = 0;
        this.payload = Buffer.from([control, this.callbackId]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                action: "Enable Smart Start listening mode",
            },
        };
    }
}
exports.EnableSmartStartListenRequest = EnableSmartStartListenRequest;
class AddNodeDSKToNetworkRequest extends AddNodeToNetworkRequestBase {
    constructor(host, options) {
        super(host, options);
        /** Whether to use high power */
        this.highPower = false;
        /** Whether to include network wide */
        this.networkWide = false;
        this.nwiHomeId = options.nwiHomeId;
        this.authHomeId = options.authHomeId;
        this.highPower = !!options.highPower;
        this.networkWide = !!options.networkWide;
    }
    serialize() {
        let control = AddNodeType.SmartStartDSK;
        if (this.highPower)
            control |= AddNodeFlags.HighPower;
        if (this.networkWide)
            control |= AddNodeFlags.NetworkWide;
        this.payload = Buffer.concat([
            Buffer.from([control, this.callbackId]),
            this.nwiHomeId,
            this.authHomeId,
        ]);
        return super.serialize();
    }
    toLogEntry() {
        const message = {
            action: "Add Smart Start node",
            "NWI Home ID": (0, shared_1.buffer2hex)(this.nwiHomeId),
            "high power": this.highPower,
            "network wide": this.networkWide,
        };
        if (this.hasCallbackId()) {
            message["callback id"] = this.callbackId;
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
}
exports.AddNodeDSKToNetworkRequest = AddNodeDSKToNetworkRequest;
class AddNodeToNetworkRequestStatusReport extends AddNodeToNetworkRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
        this.status = this.payload[1];
        switch (this.status) {
            case AddNodeStatus.Ready:
            case AddNodeStatus.NodeFound:
            case AddNodeStatus.ProtocolDone:
            case AddNodeStatus.Failed:
                // no context for the status to parse
                break;
            case AddNodeStatus.Done:
                this.statusContext = { nodeId: this.payload[2] };
                break;
            case AddNodeStatus.AddingController:
            case AddNodeStatus.AddingSlave: {
                // the payload contains a node information frame
                this.statusContext = (0, core_1.parseNodeUpdatePayload)(this.payload.slice(2));
                break;
            }
        }
    }
    isOK() {
        // Some of the status codes are for unsolicited callbacks, but
        // Failed is the only NOK status.
        return this.status !== AddNodeStatus.Failed;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                status: (0, shared_1.getEnumMemberName)(AddNodeStatus, this.status),
                "callback id": this.callbackId,
            },
        };
    }
}
exports.AddNodeToNetworkRequestStatusReport = AddNodeToNetworkRequestStatusReport;
//# sourceMappingURL=AddNodeToNetworkRequest.js.map