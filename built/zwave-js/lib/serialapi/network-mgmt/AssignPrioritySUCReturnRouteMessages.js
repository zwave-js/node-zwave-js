"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignPrioritySUCReturnRouteRequestTransmitReport = exports.AssignPrioritySUCReturnRouteResponse = exports.AssignPrioritySUCReturnRouteRequest = exports.AssignPrioritySUCReturnRouteRequestBase = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let AssignPrioritySUCReturnRouteRequestBase = class AssignPrioritySUCReturnRouteRequestBase extends serial_1.Message {
    constructor(host, options) {
        if ((0, serial_1.gotDeserializationOptions)(options) &&
            new.target !==
                AssignPrioritySUCReturnRouteRequestTransmitReport) {
            return new AssignPrioritySUCReturnRouteRequestTransmitReport(host, options);
        }
        super(host, options);
    }
};
AssignPrioritySUCReturnRouteRequestBase = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.AssignPrioritySUCReturnRoute),
    (0, serial_1.priority)(core_1.MessagePriority.Normal)
], AssignPrioritySUCReturnRouteRequestBase);
exports.AssignPrioritySUCReturnRouteRequestBase = AssignPrioritySUCReturnRouteRequestBase;
let AssignPrioritySUCReturnRouteRequest = class AssignPrioritySUCReturnRouteRequest extends AssignPrioritySUCReturnRouteRequestBase {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            if (options.repeaters.length > core_1.MAX_REPEATERS ||
                options.repeaters.some((id) => id < 1 || id > core_1.MAX_NODES)) {
                throw new core_1.ZWaveError(`The repeaters array must contain at most ${core_1.MAX_REPEATERS} node IDs between 1 and ${core_1.MAX_NODES}`, core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.nodeId = options.nodeId;
            this.repeaters = options.repeaters;
            this.routeSpeed = options.routeSpeed;
        }
    }
    serialize() {
        this.payload = Buffer.from([
            this.nodeId,
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
                "node ID": this.nodeId,
                repeaters: this.repeaters.length > 0
                    ? this.repeaters.join(" -> ")
                    : "none",
                "route speed": (0, shared_1.getEnumMemberName)(core_1.ZWaveDataRate, this.routeSpeed),
                "callback id": this.callbackId,
            },
        };
    }
};
AssignPrioritySUCReturnRouteRequest = __decorate([
    (0, serial_1.expectedResponse)(serial_1.FunctionType.AssignPrioritySUCReturnRoute),
    (0, serial_1.expectedCallback)(serial_1.FunctionType.AssignPrioritySUCReturnRoute)
], AssignPrioritySUCReturnRouteRequest);
exports.AssignPrioritySUCReturnRouteRequest = AssignPrioritySUCReturnRouteRequest;
let AssignPrioritySUCReturnRouteResponse = class AssignPrioritySUCReturnRouteResponse extends serial_1.Message {
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
AssignPrioritySUCReturnRouteResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.AssignPrioritySUCReturnRoute)
], AssignPrioritySUCReturnRouteResponse);
exports.AssignPrioritySUCReturnRouteResponse = AssignPrioritySUCReturnRouteResponse;
class AssignPrioritySUCReturnRouteRequestTransmitReport extends AssignPrioritySUCReturnRouteRequestBase {
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
exports.AssignPrioritySUCReturnRouteRequestTransmitReport = AssignPrioritySUCReturnRouteRequestTransmitReport;
//# sourceMappingURL=AssignPrioritySUCReturnRouteMessages.js.map