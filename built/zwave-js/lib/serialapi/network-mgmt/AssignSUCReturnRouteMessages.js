"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignSUCReturnRouteRequestTransmitReport = exports.AssignSUCReturnRouteResponse = exports.AssignSUCReturnRouteRequest = exports.AssignSUCReturnRouteRequestBase = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let AssignSUCReturnRouteRequestBase = class AssignSUCReturnRouteRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            if (options.origin === serial_1.MessageOrigin.Host &&
                new.target !== AssignSUCReturnRouteRequest) {
                return new AssignSUCReturnRouteRequest(host, options);
            }
            else if (options.origin !== serial_1.MessageOrigin.Host &&
                new.target !==
                    AssignSUCReturnRouteRequestTransmitReport) {
                return new AssignSUCReturnRouteRequestTransmitReport(host, options);
            }
        }
        super(host, options);
    }
};
AssignSUCReturnRouteRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.AssignSUCReturnRoute),
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], AssignSUCReturnRouteRequestBase);
exports.AssignSUCReturnRouteRequestBase = AssignSUCReturnRouteRequestBase;
let AssignSUCReturnRouteRequest = class AssignSUCReturnRouteRequest extends AssignSUCReturnRouteRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.nodeId = this.payload[0];
            this.callbackId = this.payload[1];
        }
        else {
            this.nodeId = options.nodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.nodeId, this.callbackId]);
        return super.serialize();
    }
};
AssignSUCReturnRouteRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.AssignSUCReturnRoute),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.AssignSUCReturnRoute)
], AssignSUCReturnRouteRequest);
exports.AssignSUCReturnRouteRequest = AssignSUCReturnRouteRequest;
let AssignSUCReturnRouteResponse = class AssignSUCReturnRouteResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.wasExecuted = this.payload[0] !== 0;
        }
        else {
            this.wasExecuted = options.wasExecuted;
        }
    }
    isOK() {
        return this.wasExecuted;
    }
    serialize() {
        this.payload = Buffer.from([this.wasExecuted ? 0x01 : 0]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "was executed": this.wasExecuted },
        };
    }
};
AssignSUCReturnRouteResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.AssignSUCReturnRoute)
], AssignSUCReturnRouteResponse);
exports.AssignSUCReturnRouteResponse = AssignSUCReturnRouteResponse;
class AssignSUCReturnRouteRequestTransmitReport extends AssignSUCReturnRouteRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            this.callbackId = this.payload[0];
            this.transmitStatus = this.payload[1];
        }
        else {
            this.callbackId = options.callbackId;
            this.transmitStatus = options.transmitStatus;
        }
    }
    isOK() {
        // The other statuses are technically "not OK", but they are caused by
        // not being able to contact the node. We don't want the node to be marked
        // as dead because of that
        return this.transmitStatus !== core_1.TransmitStatus.NoAck;
    }
    serialize() {
        this.payload = Buffer.from([this.callbackId, this.transmitStatus]);
        return super.serialize();
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
exports.AssignSUCReturnRouteRequestTransmitReport = AssignSUCReturnRouteRequestTransmitReport;
//# sourceMappingURL=AssignSUCReturnRouteMessages.js.map