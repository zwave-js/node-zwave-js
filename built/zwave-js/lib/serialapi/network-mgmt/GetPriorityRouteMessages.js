"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPriorityRouteResponse = exports.GetPriorityRouteRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const shared_1 = require("@zwave-js/shared");
let GetPriorityRouteRequest = class GetPriorityRouteRequest extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        if ((0, serial_1.gotDeserializationOptions)(options)) {
            throw new core_1.ZWaveError(`${this.constructor.name}: deserialization not implemented`, core_1.ZWaveErrorCodes.Deserialization_NotImplemented);
        }
        else {
            this.destinationNodeId = options.destinationNodeId;
        }
    }
    serialize() {
        this.payload = Buffer.from([this.destinationNodeId]);
        return super.serialize();
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "node ID": this.destinationNodeId,
            },
        };
    }
};
GetPriorityRouteRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetPriorityRoute),
    (0, serial_1.priority)(core_1.MessagePriority.Normal),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetPriorityRoute)
], GetPriorityRouteRequest);
exports.GetPriorityRouteRequest = GetPriorityRouteRequest;
let GetPriorityRouteResponse = class GetPriorityRouteResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.destinationNodeId = this.payload[0];
        this.repeaters = [...this.payload.slice(1, 1 + core_1.MAX_REPEATERS)].filter((id) => id > 0);
        this.routeSpeed = this.payload[1 + core_1.MAX_REPEATERS];
    }
    toLogEntry() {
        return {
            ...super.toLogEntry(),
            message: {
                "node ID": this.destinationNodeId,
                repeaters: this.repeaters.length > 0
                    ? this.repeaters.join(" -> ")
                    : "none",
                "route speed": (0, shared_1.getEnumMemberName)(core_1.ZWaveDataRate, this.routeSpeed),
            },
        };
    }
};
GetPriorityRouteResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetPriorityRoute)
], GetPriorityRouteResponse);
exports.GetPriorityRouteResponse = GetPriorityRouteResponse;
//# sourceMappingURL=GetPriorityRouteMessages.js.map