"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignPriorityReturnRouteRequestTransmitReport = exports.AssignPriorityReturnRouteResponse = exports.AssignPriorityReturnRouteRequest = exports.AssignPriorityReturnRouteRequestBase = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let AssignPriorityReturnRouteRequestBase = class AssignPriorityReturnRouteRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !==
                AssignPriorityReturnRouteRequestTransmitReport) {
            return new AssignPriorityReturnRouteRequestTransmitReport(host, options);
        }
        super(host, options);
    }
};
AssignPriorityReturnRouteRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.AssignPriorityReturnRoute),
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], AssignPriorityReturnRouteRequestBase);
exports.AssignPriorityReturnRouteRequestBase = AssignPriorityReturnRouteRequestBase;
let AssignPriorityReturnRouteRequest = class AssignPriorityReturnRouteRequest extends AssignPriorityReturnRouteRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.nodeId === options.destinationNodeId) {
                throw new core_1.ZWaveError(`The source and destination node must not be identical`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            if (options.repeaters.length > core_1.MAX_REPEATERS ||
                options.repeaters.some((id) => id < 1 || id > core_1.MAX_NODES)) {
                throw new core_1.ZWaveError(`The repeaters array must contain at most ${core_1.MAX_REPEATERS} node IDs between 1 and ${core_1.MAX_NODES}`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.nodeId = options.nodeId;
            this.destinationNodeId = options.destinationNodeId;
            this.repeaters = options.repeaters;
            this.routeSpeed = options.routeSpeed;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.nodeId,
            this.destinationNodeId,
            this.repeaters[0] ?? 0,
            this.repeaters[1] ?? 0,
            this.repeaters[2] ?? 0,
            this.repeaters[3] ?? 0,
            this.routeSpeed,
            this.callbackId,
        ]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "source node ID": this.nodeId,
                "destination node ID": this.destinationNodeId,
                repeaters: this.repeaters.length > 0
                    ? this.repeaters.join(" -> ")
                    : "none",
                "route speed": (0, shared_1.getEnumMemberName)(core_1.ZWaveDataRate, this.routeSpeed),
                "callback id": this.callbackId,
            },
        };
    }
};
AssignPriorityReturnRouteRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.AssignPriorityReturnRoute),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.AssignPriorityReturnRoute)
], AssignPriorityReturnRouteRequest);
exports.AssignPriorityReturnRouteRequest = AssignPriorityReturnRouteRequest;
let AssignPriorityReturnRouteResponse = class AssignPriorityReturnRouteResponse extends serial_1.Message {
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
AssignPriorityReturnRouteResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.AssignPriorityReturnRoute)
], AssignPriorityReturnRouteResponse);
exports.AssignPriorityReturnRouteResponse = AssignPriorityReturnRouteResponse;
class AssignPriorityReturnRouteRequestTransmitReport extends AssignPriorityReturnRouteRequestBase {
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
exports.AssignPriorityReturnRouteRequestTransmitReport = AssignPriorityReturnRouteRequestTransmitReport;
//# sourceMappingURL=AssignPriorityReturnRouteMessages.js.map