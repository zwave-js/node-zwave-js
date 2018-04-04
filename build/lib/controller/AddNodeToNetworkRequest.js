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
const CommandClass_1 = require("../commandclass/CommandClass");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
const DeviceClass_1 = require("../node/DeviceClass");
var AddNodeType;
(function (AddNodeType) {
    AddNodeType[AddNodeType["Any"] = 1] = "Any";
    AddNodeType[AddNodeType["Controller"] = 2] = "Controller";
    AddNodeType[AddNodeType["Slave"] = 3] = "Slave";
    AddNodeType[AddNodeType["Existing"] = 4] = "Existing";
    AddNodeType[AddNodeType["Stop"] = 5] = "Stop";
    AddNodeType[AddNodeType["StopFailed"] = 6] = "StopFailed";
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
let AddNodeToNetworkRequest = class AddNodeToNetworkRequest extends Message_1.Message {
    constructor(
    /** The type of node to add */
    addNodeType = AddNodeType.Any, 
    /** Whether to use high power */
    highPower, 
    /** Whether to include network wide */
    networkWide) {
        super();
        this.addNodeType = addNodeType;
        this.highPower = highPower;
        this.networkWide = networkWide;
    }
    get status() {
        return this._status;
    }
    get statusContext() {
        return this._statusContext;
    }
    serialize() {
        let data = this.addNodeType;
        if (this.highPower)
            data |= 128 /* HighPower */;
        if (this.networkWide)
            data |= 64 /* NetworkWide */;
        this.payload = Buffer.from([data]);
        return super.serialize();
    }
    // this is for reports from the controller
    deserialize(data) {
        const ret = super.deserialize(data);
        // not sure what the value in payload[0] means
        this._status = this.payload[1];
        switch (this._status) {
            case AddNodeStatus.Ready:
            case AddNodeStatus.NodeFound:
            case AddNodeStatus.ProtocolDone:
            case AddNodeStatus.Failed:
                // no context for the status to parse
                break;
            case AddNodeStatus.AddingController:
            case AddNodeStatus.Done:
                // When a controller is added, or an inclusion is finished,
                // the node ID is transmitted in payload byte #2
                this._statusContext = { nodeId: this.payload[2] };
                break;
            case AddNodeStatus.AddingSlave: {
                // the payload contains the node ID, basic, generic and specific class, and a list of CCs
                this._statusContext = {
                    nodeId: this.payload[2],
                    // length is 3
                    basic: this.payload[4],
                    generic: DeviceClass_1.GenericDeviceClass.get(this.payload[5]),
                    specific: DeviceClass_1.SpecificDeviceClass.get(this.payload[5], this.payload[6]),
                    supportedCCs: [],
                    controlledCCs: [],
                };
                // split the CCs into supported/controlled
                // tslint:disable-next-line:variable-name
                const CCs = [...this.payload.slice(7)];
                let isAfterMark = false;
                for (const cc of CCs) {
                    // CCs before the support/control mark are supported
                    // CCs after the support/control mark are controlled
                    if (cc === CommandClass_1.CommandClasses["Support/Control Mark"]) {
                        isAfterMark = true;
                        continue;
                    }
                    (isAfterMark
                        ? this._statusContext.controlledCCs
                        : this._statusContext.supportedCCs).push(cc);
                }
                break;
            }
        }
        return ret;
    }
    toJSON() {
        return super.toJSONInherited({
            status: AddNodeStatus[this.status],
            statusContext: this.statusContext,
            payload: this.statusContext != null ? undefined : this.payload,
        });
    }
};
AddNodeToNetworkRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.AddNodeToNetwork)
    // no expected response, the controller will respond with another AddNodeToNetworkRequest
    ,
    Message_1.priority(Constants_1.MessagePriority.Controller),
    __metadata("design:paramtypes", [Number, Boolean, Boolean])
], AddNodeToNetworkRequest);
exports.AddNodeToNetworkRequest = AddNodeToNetworkRequest;
// example inclusion:
// {
//     "name": "AddNodeToNetworkRequest",
//     "type": "Request",
//     "functionType": "AddNodeToNetwork",
//     "status": "NodeFound"
// }
// {
//     "name": "AddNodeToNetworkRequest",
//     "type": "Request",
//     "functionType": "AddNodeToNetwork",
//     "status": "AddingSlave",
//     "statusContext": {
//         "nodeId": 3,
//         "basic": 21,
//         "generic": {
//             "name": "Display",
//             "key": 4,
//             "mandatorySupportedCCs": [
//                 32
//             ],
//             "mandatoryControlCCs": [],
//             "specificDeviceClasses": {}
//         },
//         "specific": {
//             "name": "UNKNOWN (0x18)",
//             "key": 24,
//             "mandatorySupportedCCs": [],
//             "mandatoryControlCCs": [],
//             "basicCCForbidden": false
//         },
//         "CCs": {
//             "type": "Buffer",
//             "data": [
//                 1,
//                 94,
//                 133,
//                 89,
//                 142,
//                 96,
//                 134,
//                 112,
//                 114,
//                 90,
//                 115,
//                 132,
//                 128,
//                 91,
//                 113,
//                 122,
//                 239,
//                 37,
//                 38
//             ]
//         }
//     }
// }
// {
//     "name": "AddNodeToNetworkRequest",
//     "type": "Request",
//     "functionType": "AddNodeToNetwork",
//     "status": "ProtocolDone"
// }
