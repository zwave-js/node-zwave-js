"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BridgeApplicationCommandRequest = void 0;
const cc_1 = require("@zwave-js/cc");
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
const SendDataShared_1 = require("../transport/SendDataShared");
const ApplicationCommandRequest_1 = require("./ApplicationCommandRequest");
let BridgeApplicationCommandRequest = class BridgeApplicationCommandRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        // if (gotDeserializationOptions(options)) {
        // first byte is a status flag
        const status = this.payload[0];
        this.routedBusy = !!(status & ApplicationCommandRequest_1.ApplicationCommandStatusFlags.RoutedBusy);
        switch (status & ApplicationCommandRequest_1.ApplicationCommandStatusFlags.TypeMask) {
            case ApplicationCommandRequest_1.ApplicationCommandStatusFlags.TypeMulti:
                this.frameType = "multicast";
                break;
            case ApplicationCommandRequest_1.ApplicationCommandStatusFlags.TypeBroad:
                this.frameType = "broadcast";
                break;
            default:
                this.frameType = "singlecast";
        }
        this.isExploreFrame =
            this.frameType === "broadcast" &&
                !!(status & ApplicationCommandRequest_1.ApplicationCommandStatusFlags.Explore);
        this.isForeignFrame = !!(status & ApplicationCommandRequest_1.ApplicationCommandStatusFlags.ForeignFrame);
        this.fromForeignHomeId = !!(status & ApplicationCommandRequest_1.ApplicationCommandStatusFlags.ForeignHomeId);
        const sourceNodeId = this.payload[2];
        // Parse the CC
        const commandLength = this.payload[3];
        let offset = 4;
        this.command = cc_1.CommandClass.from(this.host, {
            data: this.payload.slice(offset, offset + commandLength),
            nodeId: sourceNodeId,
            origin: options.origin,
            frameType: this.frameType,
        });
        offset += commandLength;
        // Read the correct target node id
        const multicastNodesLength = this.payload[offset];
        offset++;
        if (this.frameType === "multicast") {
            this.targetNodeId = (0, core_1.parseNodeBitMask)(this.payload.slice(offset, offset + multicastNodesLength));
        }
        else if (this.frameType === "singlecast") {
            this.targetNodeId = this.payload[1];
        }
        else {
            this.targetNodeId = core_1.NODE_ID_BROADCAST;
        }
        offset += multicastNodesLength;
        this.rssi = (0, SendDataShared_1.tryParseRSSI)(this.payload, offset);
    }
    getNodeId() {
        if (this.command.isSinglecast()) {
            return this.command.nodeId;
        }
        return super.getNodeId();
    }
    toLogEntry() {
        const message = {};
        if (this.frameType !== "singlecast") {
            message.type = this.frameType;
        }
        if (this.targetNodeId !== this.host.ownNodeId) {
            if (typeof this.targetNodeId === "number") {
                message["target node"] = this.targetNodeId;
            }
            else if (this.targetNodeId.length === 1) {
                message["target node"] = this.targetNodeId[0];
            }
            else {
                message["target nodes"] = this.targetNodeId.join(", ");
            }
        }
        if (this.rssi !== undefined) {
            switch (true) {
                case this.rssi === core_1.RssiError.ReceiverSaturated:
                case this.rssi === core_1.RssiError.NoSignalDetected:
                    message.RSSI = (0, shared_1.getEnumMemberName)(core_1.RssiError, this.rssi);
                    break;
                // case this.rssi < RSSI_RESERVED_START:
                default:
                    message.RSSI = `${this.rssi} dBm`;
                    break;
            }
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
BridgeApplicationCommandRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.BridgeApplicationCommand)
    // This does not expect a response. The controller sends us this when a node sends a command
    ,
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], BridgeApplicationCommandRequest);
exports.BridgeApplicationCommandRequest = BridgeApplicationCommandRequest;
//# sourceMappingURL=BridgeApplicationCommandRequest.js.map