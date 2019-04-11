"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const CommandClass_1 = require("../commandclass/CommandClass");
const Constants_1 = require("../message/Constants");
const Message_1 = require("../message/Message");
let ApplicationCommandRequest = class ApplicationCommandRequest extends Message_1.Message {
    get routedBusy() {
        return this._routedBusy;
    }
    get isBroadcast() {
        return this._isBroadcast;
    }
    get command() {
        return this._command;
    }
    serialize() {
        throw new Error("serialize() for ApplicationCommandRequest not implemented");
    }
    deserialize(data) {
        const ret = super.deserialize(data);
        // first byte is a status flag
        const status = this.payload[0];
        this._isBroadcast = (status & 4 /* Broadcast */) !== 0;
        this._routedBusy = (status & 1 /* RoutedBusy */) !== 0;
        // followed by a command class
        // const serializedCC = this.payload.slice(1);
        // const cc = CommandClass.getCommandClass(serializedCC);
        // const nodeId = CommandClass.getNodeId(serializedCC);
        // const ccVersion = this.driver != null ? this.driver.getSupportedCCVersionForNode(nodeId, cc) : undefined;
        this._command = CommandClass_1.CommandClass.from(this.driver, this.payload.slice(1));
        return ret;
    }
};
ApplicationCommandRequest = __decorate([
    Message_1.messageTypes(Constants_1.MessageType.Request, Constants_1.FunctionType.ApplicationCommand)
    // This does not expect a response. The controller sends us this when a node sends a command
    ,
    Message_1.priority(Constants_1.MessagePriority.Normal)
], ApplicationCommandRequest);
exports.ApplicationCommandRequest = ApplicationCommandRequest;
