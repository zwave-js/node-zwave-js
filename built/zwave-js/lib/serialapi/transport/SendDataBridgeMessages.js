"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendDataMulticastBridgeResponse = exports.SendDataMulticastBridgeRequestTransmitReport = exports.SendDataMulticastBridgeRequest = exports.SendDataMulticastBridgeRequestBase = exports.SendDataBridgeResponse = exports.SendDataBridgeRequestTransmitReport = exports.SendDataBridgeRequest = exports.SendDataBridgeRequestBase = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
const math_1 = require("alcalzone-shared/math");
const ApplicationCommandRequest_1 = require("../application/ApplicationCommandRequest");
const BridgeApplicationCommandRequest_1 = require("../application/BridgeApplicationCommandRequest");
const SendDataMessages_1 = require("./SendDataMessages");
const SendDataShared_1 = require("./SendDataShared");
let SendDataBridgeRequestBase = class SendDataBridgeRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== SendDataBridgeRequestTransmitReport) {
            return new SendDataBridgeRequestTransmitReport(host, options);
        }
        super(host, options);
    }
};
SendDataBridgeRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SendDataBridge),
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], SendDataBridgeRequestBase);
exports.SendDataBridgeRequestBase = SendDataBridgeRequestBase;
let SendDataBridgeRequest = class SendDataBridgeRequest extends SendDataBridgeRequestBase {
    constructor(host, options) {
        super(host, options);
        this._maxSendAttempts = 1;
        if (!options.command.isSinglecast() && !options.command.isBroadcast()) {
            throw new core_1.ZWaveError(`SendDataBridgeRequest can only be used for singlecast and broadcast CCs`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this.sourceNodeId = options.sourceNodeId ?? host.ownNodeId;
        this.command = options.command;
        this.transmitOptions =
            options.transmitOptions ?? core_1.TransmitOptions.DEFAULT;
        if (options.maxSendAttempts != undefined) {
            this.maxSendAttempts = options.maxSendAttempts;
        }
    }
    /** The number of times the driver may try to send this message */
    get maxSendAttempts() {
        return this._maxSendAttempts;
    }
    set maxSendAttempts(value) {
        this._maxSendAttempts = (0, math_1.clamp)(value, 1, SendDataMessages_1.MAX_SEND_ATTEMPTS);
    }
    getNodeId() {
        return this.command.nodeId;
    }
    /** @internal */
    serializeCC() {
        if (!this._serializedCC) {
            this._serializedCC = this.command.serialize();
        }
        return this._serializedCC;
    }
    prepareRetransmission() {
        this.command.prepareRetransmission();
        this._serializedCC = undefined;
        this.callbackId = undefined;
    }
    serialize() {
        const serializedCC = this.serializeCC();
        this.payload = Buffer.concat([
            Buffer.from([
                this.sourceNodeId,
                this.command.nodeId,
                serializedCC.length,
            ]),
            serializedCC,
            Buffer.from([this.transmitOptions, 0, 0, 0, 0, this.callbackId]),
        ]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "source node id": this.sourceNodeId,
                "transmit options": (0, shared_1.num2hex)(this.transmitOptions),
                "callback id": this.callbackId,
            },
        };
    }
    /** Computes the maximum payload size that can be transmitted with this message */
    getMaxPayloadLength() {
        // From INS13954-7, chapter 4.3.3.1.5
        if (this.transmitOptions & core_1.TransmitOptions.Explore)
            return 46;
        if (this.transmitOptions & core_1.TransmitOptions.AutoRoute)
            return 48;
        return 54;
    }
    expectsNodeUpdate() {
        return (
        // Only true singlecast commands may expect a response
        this.command.isSinglecast() &&
            // ... and only if the command expects a response
            this.command.expectsCCResponse());
    }
    isExpectedNodeUpdate(msg) {
        return ((msg instanceof ApplicationCommandRequest_1.ApplicationCommandRequest ||
            msg instanceof BridgeApplicationCommandRequest_1.BridgeApplicationCommandRequest) &&
            this.command.isExpectedCCResponse(msg.command));
    }
};
SendDataBridgeRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.SendDataBridge),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.SendDataBridge)
], SendDataBridgeRequest);
exports.SendDataBridgeRequest = SendDataBridgeRequest;
class SendDataBridgeRequestTransmitReport extends SendDataBridgeRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.callbackId = this.payload[0];
            this.transmitStatus = this.payload[1];
            this.txReport = (0, SendDataShared_1.parseTXReport)(this.transmitStatus !== core_1.TransmitStatus.NoAck, this.payload.slice(2));
        }
        else {
            this.callbackId = options.callbackId;
            this.transmitStatus = options.transmitStatus;
        }
    }
    isOK() {
        return this.transmitStatus === core_1.TransmitStatus.OK;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "callback id": this.callbackId,
                "transmit status": (0, shared_1.getEnumMemberName)(core_1.TransmitStatus, this.transmitStatus) +
                    (this.txReport
                        ? `, took ${this.txReport.txTicks * 10} ms`
                        : ""),
                ...(this.txReport
                    ? (0, SendDataShared_1.txReportToMessageRecord)(this.txReport)
                    : {}),
            },
        };
    }
}
exports.SendDataBridgeRequestTransmitReport = SendDataBridgeRequestTransmitReport;
let SendDataBridgeResponse = class SendDataBridgeResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this._wasSent = this.payload[0] !== 0;
    }
    isOK() {
        return this._wasSent;
    }
    get wasSent() {
        return this._wasSent;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "was sent": this.wasSent },
        };
    }
};
SendDataBridgeResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.SendDataBridge)
], SendDataBridgeResponse);
exports.SendDataBridgeResponse = SendDataBridgeResponse;
let SendDataMulticastBridgeRequestBase = class SendDataMulticastBridgeRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== SendDataMulticastBridgeRequestTransmitReport) {
            return new SendDataMulticastBridgeRequestTransmitReport(host, options);
        }
        super(host, options);
    }
};
SendDataMulticastBridgeRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.SendDataMulticastBridge),
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], SendDataMulticastBridgeRequestBase);
exports.SendDataMulticastBridgeRequestBase = SendDataMulticastBridgeRequestBase;
let SendDataMulticastBridgeRequest = class SendDataMulticastBridgeRequest extends SendDataMulticastBridgeRequestBase {
    constructor(host, options) {
        super(host, options);
        this._maxSendAttempts = 1;
        if (!options.command.isMulticast()) {
            throw new core_1.ZWaveError(`SendDataMulticastBridgeRequest can only be used for multicast CCs`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else if (options.command.nodeId.length === 0) {
            throw new core_1.ZWaveError(`At least one node must be targeted`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        else if (options.command.nodeId.some((n) => n < 1 || n > core_1.MAX_NODES)) {
            throw new core_1.ZWaveError(`All node IDs must be between 1 and ${core_1.MAX_NODES}!`, core_1.ZWaveErrorCodes.Argument_Invalid);
        }
        this.sourceNodeId = options.sourceNodeId ?? host.ownNodeId;
        this.command = options.command;
        this.transmitOptions =
            options.transmitOptions ?? core_1.TransmitOptions.DEFAULT;
        if (options.maxSendAttempts != undefined) {
            this.maxSendAttempts = options.maxSendAttempts;
        }
    }
    /** The number of times the driver may try to send this message */
    get maxSendAttempts() {
        return this._maxSendAttempts;
    }
    set maxSendAttempts(value) {
        this._maxSendAttempts = (0, math_1.clamp)(value, 1, SendDataMessages_1.MAX_SEND_ATTEMPTS);
    }
    getNodeId() {
        // This is multicast, getNodeId must return undefined here
        return undefined;
    }
    /** @internal */
    serializeCC() {
        if (!this._serializedCC) {
            this._serializedCC = this.command.serialize();
        }
        return this._serializedCC;
    }
    prepareRetransmission() {
        this.command.prepareRetransmission();
        this._serializedCC = undefined;
        this.callbackId = undefined;
    }
    serialize() {
        const serializedCC = this.serializeCC();
        this.payload = Buffer.concat([
            // # of target nodes and nodeIds
            Buffer.from([
                this.sourceNodeId,
                this.command.nodeId.length,
                ...this.command.nodeId,
                serializedCC.length,
            ]),
            // payload
            serializedCC,
            Buffer.from([this.transmitOptions, this.callbackId]),
        ]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "source node id": this.sourceNodeId,
                "target nodes": this.command.nodeId.join(", "),
                "transmit options": (0, shared_1.num2hex)(this.transmitOptions),
                "callback id": this.callbackId,
            },
        };
    }
    /** Computes the maximum payload size that can be transmitted with this message */
    getMaxPayloadLength() {
        // From INS13954-13, chapter 4.3.3.6
        if (this.transmitOptions & core_1.TransmitOptions.ACK) {
            if (this.transmitOptions & core_1.TransmitOptions.Explore)
                return 17;
            if (this.transmitOptions & core_1.TransmitOptions.AutoRoute)
                return 19;
        }
        return 25;
    }
};
SendDataMulticastBridgeRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.SendDataMulticastBridge),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.SendDataMulticastBridge)
], SendDataMulticastBridgeRequest);
exports.SendDataMulticastBridgeRequest = SendDataMulticastBridgeRequest;
class SendDataMulticastBridgeRequestTransmitReport extends SendDataMulticastBridgeRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.callbackId = this.payload[0];
            this._transmitStatus = this.payload[1];
        }
        else {
            this.callbackId = options.callbackId;
            this._transmitStatus = options.transmitStatus;
        }
    }
    get transmitStatus() {
        return this._transmitStatus;
    }
    isOK() {
        return this._transmitStatus === core_1.TransmitStatus.OK;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "callback id": this.callbackId,
                "transmit status": (0, shared_1.getEnumMemberName)(core_1.TransmitStatus, this.transmitStatus),
            },
        };
    }
}
exports.SendDataMulticastBridgeRequestTransmitReport = SendDataMulticastBridgeRequestTransmitReport;
let SendDataMulticastBridgeResponse = class SendDataMulticastBridgeResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this._wasSent = this.payload[0] !== 0;
    }
    isOK() {
        return this._wasSent;
    }
    get wasSent() {
        return this._wasSent;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "was sent": this.wasSent },
        };
    }
};
SendDataMulticastBridgeResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.SendDataMulticastBridge)
], SendDataMulticastBridgeResponse);
exports.SendDataMulticastBridgeResponse = SendDataMulticastBridgeResponse;
//# sourceMappingURL=SendDataBridgeMessages.js.map