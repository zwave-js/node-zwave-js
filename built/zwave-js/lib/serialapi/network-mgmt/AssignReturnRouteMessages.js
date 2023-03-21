"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignReturnRouteRequestTransmitReport = exports.AssignReturnRouteResponse = exports.AssignReturnRouteRequest = exports.AssignReturnRouteRequestBase = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let AssignReturnRouteRequestBase = class AssignReturnRouteRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !== AssignReturnRouteRequestTransmitReport) {
            return new AssignReturnRouteRequestTransmitReport(host, options);
        }
        super(host, options);
    }
};
AssignReturnRouteRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.AssignReturnRoute),
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], AssignReturnRouteRequestBase);
exports.AssignReturnRouteRequestBase = AssignReturnRouteRequestBase;
let AssignReturnRouteRequest = class AssignReturnRouteRequest extends AssignReturnRouteRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.nodeId === options.destinationNodeId) {
                throw new core_1.ZWaveError(`The source and destination node must not be identical`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.nodeId = options.nodeId;
            this.destinationNodeId = options.destinationNodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.nodeId,
            this.destinationNodeId,
            this.callbackId,
        ]);
        return super.serialize();
    }
};
AssignReturnRouteRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.AssignReturnRoute),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.AssignReturnRoute)
], AssignReturnRouteRequest);
exports.AssignReturnRouteRequest = AssignReturnRouteRequest;
let AssignReturnRouteResponse = class AssignReturnRouteResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.hasStarted = this.payload[0] !== 0;
    }
    isOK() {
        return this.hasStarted;
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: { "has started": this.hasStarted },
        };
    }
};
AssignReturnRouteResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.AssignReturnRoute)
], AssignReturnRouteResponse);
exports.AssignReturnRouteResponse = AssignReturnRouteResponse;
class AssignReturnRouteRequestTransmitReport extends AssignReturnRouteRequestBase {
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
exports.AssignReturnRouteRequestTransmitReport = AssignReturnRouteRequestTransmitReport;
//# sourceMappingURL=AssignReturnRouteMessages.js.map