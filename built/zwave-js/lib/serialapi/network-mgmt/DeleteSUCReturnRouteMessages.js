"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteSUCReturnRouteRequestTransmitReport = exports.DeleteSUCReturnRouteResponse = exports.DeleteSUCReturnRouteRequest = exports.DeleteSUCReturnRouteRequestBase = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let DeleteSUCReturnRouteRequestBase = class DeleteSUCReturnRouteRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== DeleteSUCReturnRouteRequestTransmitReport) {
            return new DeleteSUCReturnRouteRequestTransmitReport(host, options);
        }
        super(host, options);
    }
};
DeleteSUCReturnRouteRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.DeleteSUCReturnRoute),
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], DeleteSUCReturnRouteRequestBase);
exports.DeleteSUCReturnRouteRequestBase = DeleteSUCReturnRouteRequestBase;
let DeleteSUCReturnRouteRequest = class DeleteSUCReturnRouteRequest extends DeleteSUCReturnRouteRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
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
DeleteSUCReturnRouteRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.DeleteSUCReturnRoute),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.DeleteSUCReturnRoute)
], DeleteSUCReturnRouteRequest);
exports.DeleteSUCReturnRouteRequest = DeleteSUCReturnRouteRequest;
let DeleteSUCReturnRouteResponse = class DeleteSUCReturnRouteResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.wasExecuted = this.payload[0] !== 0;
    }
    isOK() {
        return this.wasExecuted;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "was executed": this.wasExecuted },
        };
    }
};
DeleteSUCReturnRouteResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.DeleteSUCReturnRoute)
], DeleteSUCReturnRouteResponse);
exports.DeleteSUCReturnRouteResponse = DeleteSUCReturnRouteResponse;
class DeleteSUCReturnRouteRequestTransmitReport extends DeleteSUCReturnRouteRequestBase {
    constructor(host, options) {
        super(host, options);
        this.callbackId = this.payload[0];
        this.transmitStatus = this.payload[1];
    }
    isOK() {
        // The other statuses are technically "not OK", but they are caused by
        // not being able to contact the node. We don't want the node to be marked
        // as dead because of that
        return this.transmitStatus !== core_1.TransmitStatus.NoAck;
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
exports.DeleteSUCReturnRouteRequestTransmitReport = DeleteSUCReturnRouteRequestTransmitReport;
//# sourceMappingURL=DeleteSUCReturnRouteMessages.js.map