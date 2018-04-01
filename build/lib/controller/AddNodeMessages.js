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
var AddNodeType;
(function (AddNodeType) {
    AddNodeType[AddNodeType["Any"] = 1] = "Any";
    AddNodeType[AddNodeType["Controller"] = 2] = "Controller";
    AddNodeType[AddNodeType["Slave"] = 3] = "Slave";
    AddNodeType[AddNodeType["Existing"] = 4] = "Existing";
    AddNodeType[AddNodeType["Stop"] = 5] = "Stop";
    AddNodeType[AddNodeType["StopFailed"] = 6] = "StopFailed";
})(AddNodeType = exports.AddNodeType || (exports.AddNodeType = {}));
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
    // tslint:enable:unified-signatures
    serialize() {
        let data = this.addNodeType;
        if (this.highPower)
            data |= 128 /* HighPower */;
        if (this.networkWide)
            data |= 64 /* NetworkWide */;
        this.payload = Buffer.from([data]);
        return super.serialize();
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
