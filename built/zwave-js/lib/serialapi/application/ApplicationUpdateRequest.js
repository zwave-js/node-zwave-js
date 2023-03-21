"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationUpdateRequestSmartStartHomeIDReceived = exports.ApplicationUpdateRequestNodeRemoved = exports.ApplicationUpdateRequestNodeAdded = exports.ApplicationUpdateRequestNodeInfoRequestFailed = exports.ApplicationUpdateRequestNodeInfoReceived = exports.ApplicationUpdateRequestWithNodeInfo = exports.ApplicationUpdateRequest = exports.ApplicationUpdateTypes = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
var ApplicationUpdateTypes;
(function (ApplicationUpdateTypes) {
    ApplicationUpdateTypes[ApplicationUpdateTypes["SmartStart_NodeInfo_Received"] = 134] = "SmartStart_NodeInfo_Received";
    ApplicationUpdateTypes[ApplicationUpdateTypes["SmartStart_HomeId_Received"] = 133] = "SmartStart_HomeId_Received";
    ApplicationUpdateTypes[ApplicationUpdateTypes["NodeInfo_Received"] = 132] = "NodeInfo_Received";
    ApplicationUpdateTypes[ApplicationUpdateTypes["NodeInfo_RequestDone"] = 130] = "NodeInfo_RequestDone";
    ApplicationUpdateTypes[ApplicationUpdateTypes["NodeInfo_RequestFailed"] = 129] = "NodeInfo_RequestFailed";
    ApplicationUpdateTypes[ApplicationUpdateTypes["RoutingPending"] = 128] = "RoutingPending";
    ApplicationUpdateTypes[ApplicationUpdateTypes["Node_Added"] = 64] = "Node_Added";
    ApplicationUpdateTypes[ApplicationUpdateTypes["Node_Removed"] = 32] = "Node_Removed";
    ApplicationUpdateTypes[ApplicationUpdateTypes["SUC_IdChanged"] = 16] = "SUC_IdChanged";
})(ApplicationUpdateTypes = exports.ApplicationUpdateTypes || (exports.ApplicationUpdateTypes = {}));
const { decorator: applicationUpdateType, lookupConstructor: getApplicationUpdateRequestConstructor, lookupValue: getApplicationUpdateType, } = (0, core_1.createSimpleReflectionDecorator)({
    name: "applicationUpdateType",
});
let ApplicationUpdateRequest = class ApplicationUpdateRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.updateType = this.payload[0];
            const CommandConstructor = getApplicationUpdateRequestConstructor(this.updateType);
            if (CommandConstructor &&
                new.target !== CommandConstructor) {
                return new CommandConstructor(host, options);
            }
            this.payload = this.payload.slice(1);
        }
        else {
            this.updateType = getApplicationUpdateType(this);
        }
    }
    serialize() {
        this.payload = Buffer.concat([
            Buffer.from([this.updateType]),
            this.payload,
        ]);
        return super.serialize();
    }
};
ApplicationUpdateRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.ApplicationUpdateRequest)
    // this is only received, not sent!
], ApplicationUpdateRequest);
exports.ApplicationUpdateRequest = ApplicationUpdateRequest;
class ApplicationUpdateRequestWithNodeInfo extends ApplicationUpdateRequest {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.nodeInformation = (0, core_1.parseNodeUpdatePayload)(this.payload);
            this.nodeId = this.nodeInformation.nodeId;
        }
        else {
            this.nodeId = options.nodeInformation.nodeId;
            this.nodeInformation = options.nodeInformation;
        }
    }
    serialize() {
        this.payload = (0, core_1.encodeNodeUpdatePayload)(this.nodeInformation);
        return super.serialize();
    }
}
exports.ApplicationUpdateRequestWithNodeInfo = ApplicationUpdateRequestWithNodeInfo;
let ApplicationUpdateRequestNodeInfoReceived = class ApplicationUpdateRequestNodeInfoReceived extends ApplicationUpdateRequestWithNodeInfo {
};
ApplicationUpdateRequestNodeInfoReceived = __decorate([
    applicationUpdateType(ApplicationUpdateTypes.NodeInfo_Received)
], ApplicationUpdateRequestNodeInfoReceived);
exports.ApplicationUpdateRequestNodeInfoReceived = ApplicationUpdateRequestNodeInfoReceived;
let ApplicationUpdateRequestNodeInfoRequestFailed = class ApplicationUpdateRequestNodeInfoRequestFailed extends ApplicationUpdateRequest {
    isOK() {
        return false;
    }
};
ApplicationUpdateRequestNodeInfoRequestFailed = __decorate([
    applicationUpdateType(ApplicationUpdateTypes.NodeInfo_RequestFailed)
], ApplicationUpdateRequestNodeInfoRequestFailed);
exports.ApplicationUpdateRequestNodeInfoRequestFailed = ApplicationUpdateRequestNodeInfoRequestFailed;
let ApplicationUpdateRequestNodeAdded = class ApplicationUpdateRequestNodeAdded extends ApplicationUpdateRequestWithNodeInfo {
};
ApplicationUpdateRequestNodeAdded = __decorate([
    applicationUpdateType(ApplicationUpdateTypes.Node_Added)
], ApplicationUpdateRequestNodeAdded);
exports.ApplicationUpdateRequestNodeAdded = ApplicationUpdateRequestNodeAdded;
let ApplicationUpdateRequestNodeRemoved = class ApplicationUpdateRequestNodeRemoved extends ApplicationUpdateRequest {
    constructor(host, options) {
        super(host, options);
        this.nodeId = this.payload[0];
        // byte 1 is 0, meaning unknown
    }
};
ApplicationUpdateRequestNodeRemoved = __decorate([
    applicationUpdateType(ApplicationUpdateTypes.Node_Removed)
], ApplicationUpdateRequestNodeRemoved);
exports.ApplicationUpdateRequestNodeRemoved = ApplicationUpdateRequestNodeRemoved;
let ApplicationUpdateRequestSmartStartHomeIDReceived = class ApplicationUpdateRequestSmartStartHomeIDReceived extends ApplicationUpdateRequest {
    constructor(host, options) {
        super(host, options);
        this.remoteNodeId = this.payload[0];
        // payload[1] is rxStatus
        this.nwiHomeId = this.payload.slice(2, 6);
        const ccLength = this.payload[6];
        this.basicDeviceClass = this.payload[7];
        this.genericDeviceClass = this.payload[8];
        this.specificDeviceClass = this.payload[9];
        this.supportedCCs = (0, core_1.parseCCList)(this.payload.slice(10, 10 + ccLength)).supportedCCs;
    }
    toLogEntry() {
        const message = {
            type: (0, shared_1.getEnumMemberName)(ApplicationUpdateTypes, this.updateType),
            "remote node ID": this.remoteNodeId,
            "NWI home ID": (0, shared_1.buffer2hex)(this.nwiHomeId),
            "basic device class": this.basicDeviceClass,
            "generic device class": this.genericDeviceClass,
            "specific device class": this.specificDeviceClass,
            "supported CCs": this.supportedCCs
                .map((cc) => `\n· ${(0, core_1.getCCName)(cc)}`)
                .join(""),
        };
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
ApplicationUpdateRequestSmartStartHomeIDReceived = __decorate([
    applicationUpdateType(ApplicationUpdateTypes.SmartStart_HomeId_Received)
], ApplicationUpdateRequestSmartStartHomeIDReceived);
exports.ApplicationUpdateRequestSmartStartHomeIDReceived = ApplicationUpdateRequestSmartStartHomeIDReceived;
//# sourceMappingURL=ApplicationUpdateRequest.js.map