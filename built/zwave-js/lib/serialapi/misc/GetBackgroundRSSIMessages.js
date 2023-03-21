"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetBackgroundRSSIResponse = exports.GetBackgroundRSSIRequest = void 0;
const core_1 = require("@zwave-js/core");
const serial_1 = require("@zwave-js/serial");
const SendDataShared_1 = require("../transport/SendDataShared");
let GetBackgroundRSSIRequest = class GetBackgroundRSSIRequest extends serial_1.Message {
};
GetBackgroundRSSIRequest = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Request, serial_1.FunctionType.GetBackgroundRSSI),
    (0, serial_1.priority)(core_1.MessagePriority.Normal),
    (0, serial_1.expectedResponse)(serial_1.FunctionType.GetBackgroundRSSI)
], GetBackgroundRSSIRequest);
exports.GetBackgroundRSSIRequest = GetBackgroundRSSIRequest;
let GetBackgroundRSSIResponse = class GetBackgroundRSSIResponse extends serial_1.Message {
    constructor(host, options) {
        super(host, options);
        this.rssiChannel0 = (0, SendDataShared_1.parseRSSI)(this.payload, 0);
        this.rssiChannel1 = (0, SendDataShared_1.parseRSSI)(this.payload, 1);
        this.rssiChannel2 = (0, SendDataShared_1.tryParseRSSI)(this.payload, 2);
    }
    toLogEntry() {
        const message = {
            "channel 0": (0, core_1.rssiToString)(this.rssiChannel0),
            "channel 1": (0, core_1.rssiToString)(this.rssiChannel1),
        };
        if (this.rssiChannel2 != undefined) {
            message["channel 2"] = (0, core_1.rssiToString)(this.rssiChannel2);
        }
        return {
            ...super.toLogEntry(),
            message,
        };
    }
};
GetBackgroundRSSIResponse = __decorate([
    (0, serial_1.messageTypes)(serial_1.MessageType.Response, serial_1.FunctionType.GetBackgroundRSSI)
], GetBackgroundRSSIResponse);
exports.GetBackgroundRSSIResponse = GetBackgroundRSSIResponse;
//# sourceMappingURL=GetBackgroundRSSIMessages.js.map